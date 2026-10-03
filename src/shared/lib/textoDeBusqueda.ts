/**
 * La forma en que se compara un texto con lo que el operador escribio en un
 * buscador: sin mayusculas, sin acentos y sin espacios en los bordes. La
 * enie se conserva: "peña" y "pena" son palabras distintas.
 */
export const normalizarParaBusqueda = (texto: string): string =>
  texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/n\u0303/g, "\u00f1")
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC");
