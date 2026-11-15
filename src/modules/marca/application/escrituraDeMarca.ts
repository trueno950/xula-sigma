import type { ContextoActual } from "@/shared/auth/contexto";
import { TenantNoResueltoError, ValidacionError } from "@/shared/lib/errores";
import { validarMarca } from "@/shared/marca";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeMarca } from "./puertos";

/**
 * La unica escritura de `ayuntamientos.marca` del modulo.
 *
 * Existe porque son tres —escudo, colores y restablecimiento— y las tres
 * tienen que hacer lo mismo antes de guardar (S7): leer la marca existente,
 * componer sobre ella, correr `validarMarca` sobre el resultado completo y
 * escribir el UPDATE con su traza en la misma transaccion. Escrita tres
 * veces, la primera que se olvidara de validar dejaria una marca ilegible
 * pintada en toda la aplicacion.
 */

const esObjetoPlano = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

/** La marca completa a escribir, compuesta sobre la que ya estaba. */
export type Composicion = (
  base: Record<string, unknown>,
) => Record<string, unknown>;

const registrarCambio = (
  tx: TransaccionTenant,
  contexto: ContextoActual,
): Promise<unknown> =>
  registrar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion: "CAMBIAR_MARCA",
    entidad: "ayuntamientos",
    entidadId: contexto.ayuntamientoId,
  });

/**
 * Devuelve la marca que habia antes de escribir, para quien necesite
 * compararla —`cambiarEscudo` borra el escudo anterior—.
 *
 * `validarMarca` es precondicion, no normalizador: se escribe el crudo
 * compuesto y no `veredicto.marca`, porque Zod descarta las claves que no
 * conoce y eso borraria en silencio un campo futuro pegado a mano.
 */
export async function escribirMarcaCompuesta(
  repositorio: RepositorioDeMarca,
  contexto: ContextoActual,
  componer: Composicion,
): Promise<Record<string, unknown>> {
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const fila = await repositorio.leer(tx, contexto.ayuntamientoId);

    if (fila === null) throw new TenantNoResueltoError();

    const base = esObjetoPlano(fila) ? fila : {};
    const propuesta = componer(base);
    const veredicto = validarMarca(propuesta);

    if (!veredicto.ok) throw new ValidacionError(veredicto.campos);

    await repositorio.escribir(tx, contexto.ayuntamientoId, propuesta);
    await registrarCambio(tx, contexto);

    return base;
  });
}
