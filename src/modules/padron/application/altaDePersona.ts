import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoPersonaId,
  type DatosDePersona,
  Persona,
  type PersonaId,
} from "../domain";
import type { CatalogoDeAbreviaturas, RepositorioDePersonas } from "./puertos";

/**
 * Alta de una persona: rol, dominio, un `withTenant` que lee el catalogo,
 * guarda y registra en bitacora (design.md seccion 8, flujo ALTA). Mismo
 * orden que `cambiarEscudo`: rol antes que nada, dominio antes de tocar
 * infraestructura, escritura y bitacora dentro de la misma transaccion.
 */
export function crearAltaDePersona(
  repositorio: RepositorioDePersonas,
  catalogo: CatalogoDeAbreviaturas,
) {
  return async function altaDePersona(
    datos: DatosDePersona,
    contexto: ContextoActual,
  ): Promise<{ id: PersonaId }> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    const persona = Persona.crear(datos);
    const id = comoPersonaId(randomUUID());

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const expansiones = await catalogo.leer(tx);

      await repositorio.guardar(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
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
        accion: "ALTA_PERSONA",
        entidad: "personas",
        entidadId: id,
      });
    });

    return { id };
  };
}
