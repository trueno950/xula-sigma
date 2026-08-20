import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { validarMarca } from "@/shared/marca";
import { registrar } from "@/shared/tenancy/bitacora";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { claveDeEscudo } from "../domain/claveDeEscudo";
import { type MotivoDeRechazo, validarPng } from "../domain/png";
import type { EntradaDeEscudo, EscudoCambiado } from "../types";
import type { AlmacenDeAssets, RepositorioDeMarca } from "./puertos";

/**
 * El camino de escritura completo: rol, validacion de bytes, PUT al
 * almacen, transaccion con UPDATE + bitacora, y borrado diferido del
 * escudo anterior. Orden fijado por decision 4 de proposal.md — ver
 * design.md seccion 5 para el porque de cada paso.
 *
 * Ni el UPDATE de `ayuntamientos.marca` ni el borrado en R2 se componen
 * aca a mano (antipatron 7 de `AGENTS.md`): los dos puertos —
 * `AlmacenDeAssets` y `RepositorioDeMarca` — son lo unico que este caso de
 * uso sabe de infraestructura.
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

const exigirPngValido = (bytes: Uint8Array): void => {
  const veredicto = validarPng(bytes);

  if (!veredicto.ok) {
    throw new ValidacionError({
      escudo: MENSAJES_DE_RECHAZO[veredicto.motivo],
    });
  }
};

const marcaConEscudo = (
  base: Record<string, unknown>,
  url: string,
): Record<string, unknown> => {
  const propuesta = validarMarca({ ...base, escudo: url });

  if (!propuesta.ok) throw new ValidacionError(propuesta.campos);

  // `validarMarca` es precondicion, no normalizador: se devuelve el crudo
  // compuesto y no `propuesta.marca`, porque Zod descarta claves que no
  // conoce y eso borraria en silencio un campo futuro pegado a mano
  // (design.md seccion 5).
  return { ...base, escudo: url };
};

const registrarCambio = async (
  tx: TransaccionTenant,
  contexto: ContextoActual,
): Promise<void> => {
  await registrar(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion: "CAMBIAR_MARCA",
    entidad: "ayuntamientos",
    entidadId: contexto.ayuntamientoId,
  });
};

/** Devuelve la URL que habia antes, para el borrado diferido. */
const escribirEscudo = (
  repositorio: RepositorioDeMarca,
  contexto: ContextoActual,
  url: string,
): Promise<string | undefined> =>
  withTenant(contexto.ayuntamientoId, async (tx) => {
    const filaMarca = await repositorio.leer(tx, contexto.ayuntamientoId);

    if (filaMarca === null) throw new TenantNoResueltoError();

    const base = esObjetoPlano(filaMarca) ? filaMarca : {};

    await repositorio.escribir(
      tx,
      contexto.ayuntamientoId,
      marcaConEscudo(base, url),
    );

    await registrarCambio(tx, contexto);

    return urlAnteriorDe(base);
  });

// Fuera de la transaccion y best-effort: la verdad esta en Postgres, no en
// el bucket. Un borrado que falla no cambia el resultado ya confirmado
// (decision 7).
const borrarAnterior = (
  almacen: AlmacenDeAssets,
  ayuntamientoId: string,
  url: string,
): Promise<void> =>
  almacen.borrar(ayuntamientoId, url).catch((error: unknown) => {
    console.error(
      "[marca] no se pudo borrar el escudo anterior",
      datosSegurosDeError(error),
    );
  });

export function crearCambiarEscudo(
  almacen: AlmacenDeAssets,
  repositorio: RepositorioDeMarca,
) {
  return async function cambiarEscudo(
    entrada: EntradaDeEscudo,
    contexto: ContextoActual,
  ): Promise<EscudoCambiado> {
    if (!puedeCambiarMarca(contexto.usuario.rol)) throw new NoAutorizadoError();

    exigirPngValido(entrada.bytes);

    const clave = claveDeEscudo(contexto.ayuntamientoId, randomUUID());
    // El PUT corre antes de la transaccion (decision 4): si los bytes no
    // pasan por el servidor, la validacion en servidor es estructuralmente
    // imposible. Un fallo despues de esto deja un huerfano sin referencia,
    // aceptado por la misma decision.
    const url = await almacen.guardar(clave, entrada.bytes);

    const anterior = await escribirEscudo(repositorio, contexto, url);

    if (anterior && anterior !== url) {
      await borrarAnterior(almacen, contexto.ayuntamientoId, anterior);
    }

    return { escudo: url };
  };
}
