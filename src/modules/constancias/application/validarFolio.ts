import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type FilaDeValidacion,
  proyectarValidacion,
  type ResultadoDeValidacion,
} from "../domain";
import type { FilaParaValidar, RepositorioDeConstancias } from "./puertos";
import { esquemaDeSnapshot } from "./validacionDeSnapshot";

export type EntradaDeValidacion = {
  ayuntamientoId: AyuntamientoId;
  folio: string;
  codigo: string | null;
};

/**
 * Traduce la fila cruda del repositorio a lo que pide `proyectarValidacion`.
 * El snapshot se resuelve aca, en `application` -mismo criterio que
 * `pdfDeConstancia.ts` (design.md de `constancias-oficios`, seccion 8):
 * `infrastructure` no sabe de la forma del snapshot, solo la guarda.
 */
const aFilaDeValidacion = (
  fila: FilaParaValidar | null,
): FilaDeValidacion | null => {
  if (fila === null) return null;

  const snapshot = esquemaDeSnapshot.parse(fila.datos);

  return {
    tipo: fila.tipo,
    emitidaEn: fila.emitidaEn.toISOString(),
    canceladaEn: fila.canceladaEn?.toISOString() ?? null,
    codigoVerificacion: fila.codigoVerificacion,
    titular: snapshot.titular.nombreCompleto,
    direccion: snapshot.direccion.texto,
  };
};

/**
 * Caso de uso PUBLICO: sin `ContextoActual`, sin `usuario` (design.md de
 * `constancias-oficios`, secciones 7 y 8). Quien pregunta es un visitante
 * anonimo -no hay actor que anotar en la bitacora, y construir uno
 * inexistente la contaminaria-. `ayuntamientoId` llega resuelto por
 * subdominio desde el borde (`page.tsx`), nunca de una sesion ni del folio.
 */
export function crearValidarFolio(repositorio: RepositorioDeConstancias) {
  return function validarFolio({
    ayuntamientoId,
    folio,
    codigo,
  }: EntradaDeValidacion): Promise<ResultadoDeValidacion> {
    return withTenant(ayuntamientoId, async (tx) => {
      const fila = await repositorio.paraValidar(tx, folio);

      return proyectarValidacion(aFilaDeValidacion(fila), codigo);
    });
  };
}
