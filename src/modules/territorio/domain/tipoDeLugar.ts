/**
 * Jerarquia territorial modelada como rango, no como cadena (design.md
 * decision 6). `cabecera` y `comisaria` comparten el rango 0: son dos
 * asentamientos hermanos, ninguno contiene al otro.
 *
 * Regla unica, estricta: `rango(padre) < rango(hijo)`. De ahi salen sin
 * regla adicional: (1) `cabecera`/`comisaria` no se contienen entre si —
 * `0 < 0` es falso—, (2) un nodo de rango 0 nunca es hijo de nadie, raiz
 * por construccion, y (3) no hay ciclos, porque toda arista aumenta el
 * rango y ningun ciclo puede volver a un rango menor o igual.
 */
export const TIPOS_DE_LUGAR = [
  "cabecera",
  "comisaria",
  "colonia",
  "sector",
  "manzana",
] as const;

export type TipoDeLugar = (typeof TIPOS_DE_LUGAR)[number];

const RANGO: Record<TipoDeLugar, number> = {
  cabecera: 0,
  comisaria: 0,
  colonia: 1,
  sector: 2,
  manzana: 3,
};

export const puedeContener = (padre: TipoDeLugar, hijo: TipoDeLugar): boolean =>
  RANGO[padre] < RANGO[hijo];
