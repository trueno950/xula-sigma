import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { type DatosDePersona, Persona } from "../domain";
import type { CatalogoDeAbreviaturas, RepositorioDePersonas } from "./puertos";

/**
 * Edicion de una persona existente. `datos` trae los tres campos completos
 * —no un parche parcial—, asi que `nombreNormalizado` se recalcula entero
 * en el adaptador con lo mismo que corrigio la operadora (design.md
 * seccion 5, escenario "editar el nombre recalcula el normalizado").
 */
export function crearEditarPersona(
  repositorio: RepositorioDePersonas,
  catalogo: CatalogoDeAbreviaturas,
) {
  return async function editarPersona(
    id: string,
    datos: DatosDePersona,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    const persona = Persona.crear(datos);

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      // Sin esto, un `UPDATE ... WHERE id = $1` contra un id de otro
      // municipio -invisible por RLS, no por regla propia- afecta cero
      // filas sin fallar, y la bitacora quedaria igual afirmando una
      // edicion que nunca paso. `buscarPorId` ya resuelve "no existe" y
      // "no es tuyo" a la misma respuesta, que es el escenario 404-no-403
      // del spec.
      const existente = await repositorio.buscarPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      const expansiones = await catalogo.leer(tx);

      await repositorio.actualizar(tx, {
        id,
        persona: {
          nombres: persona.nombres,
          primerApellido: persona.primerApellido,
          segundoApellido: persona.segundoApellido,
          curp: persona.curp,
        },
        expansiones,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "EDITAR_PERSONA",
        entidad: "personas",
        entidadId: id,
      });
    });
  };
}
