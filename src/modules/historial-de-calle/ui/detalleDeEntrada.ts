import type { EntradaDeHistorial, PuntoDeHistorial } from "../domain";

const formatoDePunto = (punto: PuntoDeHistorial | null) =>
  punto
    ? `${punto.latitud.toFixed(6)}, ${punto.longitud.toFixed(6)}`
    : "sin punto";

const entreComillas = (texto: string) => `«${texto}»`;

const antesYDespues = (antes: string, ahora: string): string | null =>
  antes === ahora ? null : `antes ${antes} → ahora ${ahora}`;

const conNombres = (
  anterior: string | null,
  nuevo: string | null,
): string | null =>
  anterior === null || nuevo === null
    ? null
    : antesYDespues(entreComillas(anterior), entreComillas(nuevo));

const conPuntos = (
  anterior: PuntoDeHistorial | null,
  nuevo: PuntoDeHistorial | null,
): string | null =>
  anterior === null && nuevo === null
    ? null
    : antesYDespues(formatoDePunto(anterior), formatoDePunto(nuevo));

/**
 * Un lado que no se pudo resolver -un lugar de otro municipio, una fila
 * anterior al payload- cae en la frase de siempre en vez de mostrar la
 * mitad que falta.
 */
export const detalleDe = (
  entrada: EntradaDeHistorial,
  detalleFijo: string,
): string => {
  const cambio = entrada.cambio;
  if (!cambio) return detalleFijo;

  switch (entrada.naturaleza) {
    case "RENOMBRE":
      return (
        conNombres(cambio.nombre.anterior, cambio.nombre.nuevo) ?? detalleFijo
      );
    case "REPARENTEO":
      return (
        conNombres(cambio.lugar.anterior, cambio.lugar.nuevo) ?? detalleFijo
      );
    case "UBICACION":
      return (
        conPuntos(cambio.punto.anterior, cambio.punto.nuevo) ?? detalleFijo
      );
    default:
      return detalleFijo;
  }
};
