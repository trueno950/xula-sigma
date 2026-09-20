import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  crearAltaDeDomicilio,
  crearCorregirDomicilio,
  crearDarDeBajaDomicilio,
  crearDomicilioPorId,
  crearListarDomicilios,
  crearRegistroDeDomicilios,
  type FiltrosDeRegistro,
} from "./application";
import {
  repositorioDeCallesSql,
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeResidenciasSql,
} from "./infrastructure";

/**
 * La mitad de `composicion.ts` que arma las direcciones. Se separo cuando el
 * registro plano de la rebanada A1 empujo el archivo unico a 213 lineas,
 * trece por encima de la metrica de 200 de `AGENTS.md`. `composicion.ts` la
 * reexporta, asi que nadie cambia de import por el corte.
 */

export const listarDomicilios = crearListarDomicilios(
  repositorioDeDomiciliosSql,
);

const registroEnTransaccion = crearRegistroDeDomicilios(
  repositorioDeDomiciliosSql,
);

/**
 * La unica composicion de este archivo que abre su propia transaccion: la
 * pantalla del registro lee sin caso de uso intermedio que ya la traiga.
 */
export const registroDeDomicilios = (
  filtros: FiltrosDeRegistro,
  contexto: ContextoActual,
  limite: number,
) =>
  withTenant(contexto.ayuntamientoId, (tx) =>
    registroEnTransaccion({ tx, filtros, limite }),
  );

export const domicilioPorId = crearDomicilioPorId(repositorioDeDomiciliosSql);

export const altaDeDomicilio = crearAltaDeDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);

export const corregirDomicilio = crearCorregirDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);

export const darDeBajaDomicilio = crearDarDeBajaDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeResidenciasSql,
);
