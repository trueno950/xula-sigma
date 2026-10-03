import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";

export type FiltroVisible = {
  clave: keyof FiltrosDeRegistro;
  etiqueta: string;
};

/**
 * Los filtros puestos, con las palabras que ve la operadora: las mismas
 * dan el texto del chip y la frase del vacio por filtro. El asentamiento
 * entra por su nombre y no por su id; si no esta en el catalogo -ajeno o
 * inexistente- el filtro se aplico igual, asi que se nombra de todos modos
 * y la lista vacia no se confunde con un municipio sin domicilios.
 */
export function filtrosVisiblesDeDomicilios(
  filtros: FiltrosDeRegistro,
  nombreDeRaiz: (id: string) => string | undefined,
): readonly FiltroVisible[] {
  return [
    ...(filtros.calle
      ? [{ clave: "calle" as const, etiqueta: `Calle: ${filtros.calle}` }]
      : []),
    ...(filtros.numero
      ? [{ clave: "numero" as const, etiqueta: `Número: ${filtros.numero}` }]
      : []),
    ...(filtros.raizId
      ? [
          {
            clave: "raizId" as const,
            etiqueta: `Asentamiento: ${
              nombreDeRaiz(filtros.raizId) ?? "el elegido"
            }`,
          },
        ]
      : []),
  ];
}
