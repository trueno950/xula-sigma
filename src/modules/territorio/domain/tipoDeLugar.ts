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

/**
 * Si ese tipo puede estar arriba de todo, sin padre.
 *
 * Es la consecuencia (2) que el comentario de arriba ya enunciaba —"un nodo
 * de rango 0 nunca es hijo de nadie, raiz por construccion"— escrita como
 * funcion en vez de como prosa. Mientras vivio solo en el comentario, nada
 * la consultaba: `altaDeLugar` valida `puedeContener` unicamente cuando hay
 * `padreId`, asi que con `padreId: null` aceptaba los cinco tipos y una
 * manzana suelta quedaba de raiz del municipio.
 */
export const puedeSerRaiz = (tipo: TipoDeLugar): boolean => RANGO[tipo] === 0;

/**
 * Los tipos que ese padre acepta adentro, en el orden del catalogo.
 *
 * La usa el alta para ofrecer solo lo que va a pasar la validacion: antes
 * el formulario ofrecia los cinco tipos siempre, asi que elegir "comisaria"
 * dentro de una cabecera era un camino abierto que terminaba en
 * `JerarquiaInvalidaError` despues de enviar.
 */
export const tiposContenidosPor = (
  padre: TipoDeLugar,
): readonly TipoDeLugar[] =>
  TIPOS_DE_LUGAR.filter((hijo) => puedeContener(padre, hijo));
