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
  type LugarId,
  puedeContener,
  puedeSerRaiz,
  RaizInvalidaError,
} from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/**
 * Que el destino sea valido para ese lugar: sin padre, el tipo tiene que
 * poder ser raiz; con padre, el padre tiene que poder contenerlo.
 *
 * Vive aparte del cuerpo de la transaccion porque las dos ramas juntas
 * pasaban la metrica de complejidad cognitiva de Biome (17 sobre 15), y el
 * corte cae solo: aca se decide si el movimiento es legal, alla se escribe.
 */
async function validarDestino({
  repositorio,
  tx,
  lugar,
  nuevoPadreId,
}: {
  repositorio: RepositorioDeLugares;
  tx: TransaccionTenant;
  lugar: LugarGuardado;
  nuevoPadreId: LugarId | null;
}): Promise<void> {
  if (nuevoPadreId === null) {
    if (!puedeSerRaiz(lugar.tipo)) throw new RaizInvalidaError();
    return;
  }

  const nuevoPadre = await repositorio.buscarPorId(tx, nuevoPadreId);
  if (!nuevoPadre) throw new NoEncontradoError();
  if (!puedeContener(nuevoPadre.tipo, lugar.tipo)) {
    throw new JerarquiaInvalidaError();
  }
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
      const lugar = await repositorio.buscarPorId(tx, lugarId);
      if (!lugar) throw new NoEncontradoError();

      await validarDestino({ repositorio, tx, lugar, nuevoPadreId });

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
