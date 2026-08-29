import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoLugarId,
  JerarquiaInvalidaError,
  type LugarId,
  puedeContener,
  type TipoDeLugar,
} from "../domain";
import type { RepositorioDeLugares } from "./puertos";

export type NuevoLugar = {
  tipo: TipoDeLugar;
  nombre: string;
  padreId: LugarId | null;
};

/**
 * Alta de un lugar: `puedeEscribir`, no `puedeAdministrarTerritorio` (criterio
 * en `shared/auth/roles.ts`). Un solo `INSERT`: la jerarquia raggeada
 * (design.md seccion 7) permite que un sector cuelgue directo de una
 * comisaria sin fila de relleno para la colonia que falta.
 *
 * **`padreId` se valida igual que en `reparentearLugar`** (hallazgo de
 * GGA en la revision de esta rebanada): sin esto, un alta podia crear un
 * `tipo` que `puedeContener` rechaza para ese padre -una comisaria hija de
 * una cabecera, por ejemplo-, mismo par que `reparentearLugar` bloquea. El
 * FK compuesto de Postgres ya impide un `padreId` inexistente o de otro
 * municipio; lo que el FK no puede ver -esta el `tipo` del padre en otra
 * fila- es exactamente lo que `puedeContener` cierra aca.
 */
export function crearAltaDeLugar(repositorio: RepositorioDeLugares) {
  return async function altaDeLugar(
    datos: NuevoLugar,
    contexto: ContextoActual,
  ): Promise<{ id: LugarId }> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    const id = comoLugarId(randomUUID());

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      if (datos.padreId !== null) {
        const padre = await repositorio.buscarPorId(tx, datos.padreId);
        if (!padre) throw new NoEncontradoError();
        if (!puedeContener(padre.tipo, datos.tipo)) {
          throw new JerarquiaInvalidaError();
        }
      }

      await repositorio.crear(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        tipo: datos.tipo,
        nombre: datos.nombre,
        padreId: datos.padreId,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ALTA_LUGAR",
        entidad: "lugares",
        entidadId: id,
      });
    });

    return { id };
  };
}
