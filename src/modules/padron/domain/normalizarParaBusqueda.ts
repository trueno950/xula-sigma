/**
 * Minusculas, sin acentos, sin puntos, con abreviaturas expandidas —
 * ADR 0002 seccion 1. Se usa en dos lugares (decision 4, design.md
 * seccion 5) y tiene que ser la misma funcion en los dos: el adaptador al
 * persistir y `buscarPersonas` sobre la cadena de consulta. Si fueran dos
 * implementaciones, la comparacion de trigramas no significa nada.
 *
 * `expansiones` entra por parametro porque `domain` no importa nada: el
 * catalogo lo lee `infrastructure` y se lo pasa hecho.
 */
export function normalizarParaBusqueda(
  texto: string,
  expansiones: ReadonlyMap<string, string>,
): string {
  const sinAcentos = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tokens = sinAcentos
    .toLowerCase()
    .replace(/[.]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  return tokens.map((token) => expansiones.get(token) ?? token).join(" ");
}
