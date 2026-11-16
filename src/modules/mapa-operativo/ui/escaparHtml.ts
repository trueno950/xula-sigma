const REEMPLAZOS: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * El pin y su ventana se arman como texto porque `divIcon` de Leaflet los
 * inserta con `innerHTML`, y lo que entra trae folios de la base. Sin esto un
 * folio con `<` rompe el mapa o inyecta marcado.
 */
export const escapar = (texto: string): string =>
  texto.replace(/[&<>"']/g, (caracter) => REEMPLAZOS[caracter] ?? caracter);
