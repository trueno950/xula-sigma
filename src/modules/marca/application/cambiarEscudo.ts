import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { registrar } from "@/shared/tenancy/bitacora";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { validarMarca } from "@/shared/ui/marca";
import { claveDeEscudo } from "../domain/claveDeEscudo";
import { type MotivoDeRechazo, validarPng } from "../domain/png";
import type { EntradaDeEscudo, EscudoCambiado } from "../types";
import type { AlmacenDeAssets } from "./puertos";

/**
 * El camino de escritura completo: rol, validacion de bytes, PUT al
 * almacen, transaccion con UPDATE + bitacora, y borrado diferido del
 * escudo anterior. Orden fijado por decision 4 de proposal.md — ver
 * design.md seccion 5 para el porque de cada paso.
 */

const MENSAJES_DE_RECHAZO: Record<MotivoDeRechazo, string> = {
  VACIO: "El archivo esta vacio.",
  DEMASIADO_GRANDE: "El archivo pesa mas de 1 MiB.",
  NO_ES_PNG: "El archivo no es un PNG valido.",
  SIN_IHDR: "El archivo no es un PNG valido.",
  DIMENSIONES: "El escudo debe medir entre 80x80 y 2048x2048 pixeles.",
};

const esObjetoPlano = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const urlAnteriorDe = (marca: Record<string, unknown>): string | undefined =>
  typeof marca.escudo === "string" ? marca.escudo : undefined;

export function crearCambiarEscudo(almacen: AlmacenDeAssets) {
  return async function cambiarEscudo(
    entrada: EntradaDeEscudo,
    contexto: ContextoActual,
  ): Promise<EscudoCambiado> {
    if (!puedeCambiarMarca(contexto.usuario.rol)) throw new NoAutorizadoError();

    const veredicto = validarPng(entrada.bytes);

    if (!veredicto.ok) {
      throw new ValidacionError({
        escudo: MENSAJES_DE_RECHAZO[veredicto.motivo],
      });
    }

    const clave = claveDeEscudo(contexto.ayuntamientoId, randomUUID());
    // El PUT corre antes de la transaccion (decision 4): si los bytes no
    // pasan por el servidor, la validacion en servidor es estructuralmente
    // imposible. Un fallo despues de esto deja un huerfano sin referencia,
    // aceptado por la misma decision.
    const url = await almacen.guardar(clave, entrada.bytes);

    const anterior = await withTenant(contexto.ayuntamientoId, async (tx) => {
      const [fila] = await tx
        .select({ marca: ayuntamientos.marca })
        .from(ayuntamientos)
        .where(eq(ayuntamientos.id, contexto.ayuntamientoId));

      if (!fila) throw new TenantNoResueltoError();

      const base = esObjetoPlano(fila.marca) ? fila.marca : {};
      const propuesta = validarMarca({ ...base, escudo: url });

      // `validarMarca` es precondicion, no normalizador: se escribe el
      // crudo compuesto y no `propuesta.marca`, porque Zod descarta
      // claves que no conoce y eso borraria en silencio un campo futuro
      // pegado a mano (design.md seccion 5).
      if (!propuesta.ok) throw new ValidacionError(propuesta.campos);

      await tx
        .update(ayuntamientos)
        .set({ marca: { ...base, escudo: url } })
        .where(eq(ayuntamientos.id, contexto.ayuntamientoId));

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "CAMBIAR_MARCA",
        entidad: "ayuntamientos",
        entidadId: contexto.ayuntamientoId,
      });

      return urlAnteriorDe(base);
    });

    if (anterior && anterior !== url) {
      // Fuera de la transaccion y best-effort: la verdad esta en Postgres,
      // no en el bucket. Un borrado que falla no cambia el resultado ya
      // confirmado (decision 7).
      await almacen.borrar(anterior).catch((error: unknown) => {
        console.error(
          "[marca] no se pudo borrar el escudo anterior",
          datosSegurosDeError(error),
        );
      });
    }

    return { escudo: url };
  };
}
