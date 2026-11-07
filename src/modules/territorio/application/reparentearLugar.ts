import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  JerarquiaInvalidaError,
  LugarConDomiciliosError,
  type LugarId,
  puedeContener,
  puedeSerRaiz,
  RaizInvalidaError,
} from "../domain";
import { asentamientoContenedorDe } from "./asentamientoDeLugar";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

type Movimiento = {
  repositorio: RepositorioDeLugares;
  tx: TransaccionTenant;
  lugar: LugarGuardado;
};

/**
 * Bloquea el lugar y su destino en orden de id, el mismo criterio que
 * `idsDeCalles` (`verificacionDeDomicilio.ts`): dos movimientos cruzados
 * piden los dos locks en el mismo orden y uno espera al otro en vez de
 * trabarse. Bloquear el destino serializa el movimiento con su baja, como
 * `altaDeLugar` con el padre; quien llega segundo ve el destino dado de
 * baja como inexistente (`repositorioDeLugaresSql.bloquearPorId`).
 */
async function bloquearMovimiento(
  repositorio: RepositorioDeLugares,
  tx: TransaccionTenant,
  ids: readonly (LugarId | null)[],
): Promise<ReadonlyMap<LugarId, LugarGuardado | null>> {
  const ordenados = ids.filter((id): id is LugarId => id !== null).sort();
  const bloqueados = new Map<LugarId, LugarGuardado | null>();
  for (const id of ordenados) {
    bloqueados.set(id, await repositorio.bloquearPorId(tx, id));
  }
  return bloqueados;
}

/**
 * Que el destino sea valido para ese lugar: sin padre, el tipo tiene que
 * poder ser raiz; con padre, el padre tiene que poder contenerlo.
 *
 * Vive aparte del cuerpo de la transaccion porque las dos ramas juntas
 * pasaban la metrica de complejidad cognitiva de Biome (17 sobre 15), y el
 * corte cae solo: aca se decide si el movimiento es legal, alla se escribe.
 */
function validarDestino(
  lugar: LugarGuardado,
  nuevoPadreId: LugarId | null,
  bloqueados: ReadonlyMap<LugarId, LugarGuardado | null>,
): LugarGuardado | null {
  if (nuevoPadreId === null) {
    if (!puedeSerRaiz(lugar.tipo)) throw new RaizInvalidaError();
    return null;
  }

  const nuevoPadre = bloqueados.get(nuevoPadreId);
  if (!nuevoPadre) throw new NoEncontradoError();
  if (!puedeContener(nuevoPadre.tipo, lugar.tipo)) {
    throw new JerarquiaInvalidaError();
  }
  return nuevoPadre;
}

/**
 * Un domicilio guarda calles del asentamiento que lo contiene
 * (`verificacionDeDomicilio.ts`). Si el movimiento cambia ese asentamiento,
 * esas calles dejarian de ser de su lugar, asi que solo se permite con el
 * subarbol sin domicilios activos. Un lugar sin padre es su propio
 * asentamiento: no hay cadena que subir.
 */
async function exigirDomiciliosEnSuAsentamiento({
  repositorio,
  tx,
  lugar,
  nuevoPadre,
}: Movimiento & { nuevoPadre: LugarGuardado | null }): Promise<void> {
  const origen = lugar.padreId
    ? (await asentamientoContenedorDe(repositorio, tx, lugar)).id
    : lugar.id;
  const destino = nuevoPadre
    ? (await asentamientoContenedorDe(repositorio, tx, nuevoPadre)).id
    : lugar.id;
  if (origen === destino) return;

  const subarbol = await repositorio.subarbol(tx, lugar.id);
  if (subarbol.some((nodo) => nodo.clase === "domicilio")) {
    throw new LugarConDomiciliosError();
  }
}

/** Bloquea, valida y devuelve el lugar listo para escribir su nuevo padre. */
async function prepararMovimiento(
  repositorio: RepositorioDeLugares,
  tx: TransaccionTenant,
  pedido: { lugarId: LugarId; nuevoPadreId: LugarId | null },
): Promise<LugarGuardado> {
  const { lugarId, nuevoPadreId } = pedido;
  const bloqueados = await bloquearMovimiento(repositorio, tx, [
    lugarId,
    nuevoPadreId,
  ]);
  const lugar = bloqueados.get(lugarId);
  if (!lugar) throw new NoEncontradoError();

  const nuevoPadre = validarDestino(lugar, nuevoPadreId, bloqueados);
  await exigirDomiciliosEnSuAsentamiento({
    repositorio,
    tx,
    lugar,
    nuevoPadre,
  });
  return lugar;
}

/**
 * Mueve un lugar a otro padre. `puedeAdministrarTerritorio`, no
 * `puedeEscribir` (criterio en `shared/auth/roles.ts`).
 *
 * `nuevoPadreId = null` **no saltea el chequeo**: sin padre, el tipo del
 * lugar tiene que poder ser raiz. El comentario anterior decia lo contrario
 * —"cualquier tipo puede volverse raiz (design.md seccion 9,
 * raggedness)"— y con el, el test que lo respaldaba. Los dos contradecian
 * el spec vigente, que lo pide como MUST: "Una fila de tipo `cabecera` o
 * `comisaria` MUST tener `padreId IS NULL`; ningun otro tipo MUST tener
 * `padreId NULL`" (`openspec/specs/jerarquia-territorial`).
 * `changes/archive/` es registro historico de una decision; `specs/` es la
 * regla vigente, y gana.
 *
 * La raggedness -saltear niveles- se queda sin escalones que saltear con el
 * corte de `sector` y `manzana`: quedan dos niveles. La regla que sigue
 * vigente es la de siempre, que `puedeContener` ya expresa sola: solo
 * compara rangos.
 *
 * Bloquea el lugar antes de mirar sus domicilios: el alta y la correccion
 * de domicilio bloquean el mismo lugar, asi que un domicilio no puede
 * entrar entre el chequeo y el `UPDATE`. El destino se bloquea junto con el
 * lugar (`bloquearMovimiento`).
 */
export function crearReparentearLugar(repositorio: RepositorioDeLugares) {
  return async function reparentearLugar(
    lugarId: LugarId,
    nuevoPadreId: LugarId | null,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const lugar = await prepararMovimiento(repositorio, tx, {
        lugarId,
        nuevoPadreId,
      });

      await repositorio.actualizar(tx, {
        id: lugar.id,
        nombre: lugar.nombre,
        padreId: nuevoPadreId,
        bajaEn: lugar.bajaEn,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REPARENTEAR_LUGAR",
        entidad: "lugares",
        entidadId: lugar.id,
      });
    });
  };
}
