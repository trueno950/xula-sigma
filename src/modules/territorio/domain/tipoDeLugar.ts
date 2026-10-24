/**
 * Jerarquia territorial modelada como rango, no como cadena (design.md
 * decision 6). `cabecera` y `comisaria` comparten el rango 0: son dos
 * asentamientos hermanos, ninguno contiene al otro. `colonia` es el unico
 * rango 1 y el tipo mas profundo: el arbol de direcciones tiene dos
 * niveles fijos (design.md decision 5, rebanada B2).
 *
 * Regla unica, estricta: `rango(padre) < rango(hijo)`. De ahi salen sin
 * regla adicional: (1) `cabecera`/`comisaria` no se contienen entre si —
 * `0 < 0` es falso—, (2) un nodo de rango 0 nunca es hijo de nadie, raiz
 * por construccion, y (3) no hay ciclos, porque toda arista aumenta el
 * rango y ningun ciclo puede volver a un rango menor o igual.
 */
export const TIPOS_DE_LUGAR = ["cabecera", "comisaria", "colonia"] as const;

export type TipoDeLugar = (typeof TIPOS_DE_LUGAR)[number];

const RANGO: Record<TipoDeLugar, number> = {
  cabecera: 0,
  comisaria: 0,
  colonia: 1,
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
 * `padreId`, asi que con `padreId: null` aceptaba todos los tipos del
 * catalogo y un lugar de rango hondo quedaba de raiz del municipio.
 */
export const puedeSerRaiz = (tipo: TipoDeLugar): boolean => RANGO[tipo] === 0;

export const puedeTenerCatalogoDeCalles = (tipo: TipoDeLugar): boolean =>
  tipo === "cabecera" || tipo === "comisaria";

/**
 * Las zonas cuelgan de asentamientos, el mismo conjunto que el catalogo de
 * calles (design.md de direcciones-y-zonas-operativas, Rebanada B1): una
 * zona de una colonia no existe porque la colonia ya cuelga de su
 * asentamiento. Alias explícito y no reuso del de calles para que las dos
 * reglas puedan divergir sin editarse entre sí.
 */
export const puedeTenerZonas = puedeTenerCatalogoDeCalles;

/**
 * Los tipos que ese padre acepta adentro, en el orden del catalogo.
 *
 * La usa el alta para ofrecer solo lo que va a pasar la validacion: antes
 * el formulario ofrecia todos los tipos siempre, asi que elegir "comisaria"
 * dentro de una cabecera era un camino abierto que terminaba en
 * `JerarquiaInvalidaError` despues de enviar.
 */
export const tiposContenidosPor = (
  padre: TipoDeLugar,
): readonly TipoDeLugar[] =>
  TIPOS_DE_LUGAR.filter((hijo) => puedeContener(padre, hijo));
