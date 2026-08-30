import type { TipoDeDocumento } from "./tipoDeDocumento";

/**
 * Proyeccion publica de una constancia, en dos niveles (design.md seccion
 * 8). Puro, sin imports -ni siquiera Zod-.
 */
export type ResultadoDeValidacion =
  | { readonly estado: "NO_VALIDO" }
  | { readonly estado: "VIGENTE"; tipo: TipoDeDocumento; emitidaEn: string }
  | {
      readonly estado: "VIGENTE";
      tipo: TipoDeDocumento;
      emitidaEn: string;
      titular: string;
      direccion: string;
    };

/**
 * Constante congelada y no un literal por rama: las ramas negativas
 * devuelven **esta referencia**, nunca una copia. Dos referencias a la
 * misma constante no divergen; dos copias de un literal si.
 */
export const NO_VALIDO: ResultadoDeValidacion = Object.freeze({
  estado: "NO_VALIDO",
} as const);

export type FilaDeValidacion = {
  tipo: TipoDeDocumento;
  emitidaEn: string;
  canceladaEn: string | null;
  codigoVerificacion: string;
  titular: string;
  direccion: string;
};

export const proyectarValidacion = (
  fila: FilaDeValidacion | null,
  codigo: string | null,
): ResultadoDeValidacion => {
  if (fila === null || fila.canceladaEn !== null) return NO_VALIDO;

  const publico = {
    estado: "VIGENTE",
    tipo: fila.tipo,
    emitidaEn: fila.emitidaEn,
  } as const;

  if (codigo === null) return publico;

  return codigo === fila.codigoVerificacion
    ? { ...publico, titular: fila.titular, direccion: fila.direccion }
    : NO_VALIDO;
};
