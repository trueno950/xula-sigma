import {
  crearAgregarCalleAZona,
  crearAltaDeZona,
  crearDarDeBajaZona,
  crearLecturasDeZonas,
  crearQuitarCalleDeZona,
  crearRenombrarZona,
} from "./application";
import {
  repositorioDeLugaresSql,
  repositorioDeZonasSql,
} from "./infrastructure";

/**
 * Composicion de zonas, separada de `composicion.ts` porque ese archivo
 * llego a su metrica de 200 lineas cuando entro B3u. Mismo criterio que
 * `composicionDeDomicilios.ts`: el corte cae por tema. `domiciliosDeZona`
 * vive alla: alla se alambico en B2 y aqui redeclararlo duplicaria el
 * nombre que `composicion.ts` reexporta.
 */
export const lecturasDeZonas = crearLecturasDeZonas(
  repositorioDeZonasSql,
  repositorioDeLugaresSql,
);
export const altaDeZona = crearAltaDeZona(
  repositorioDeZonasSql,
  repositorioDeLugaresSql,
);
export const renombrarZona = crearRenombrarZona(repositorioDeZonasSql);
export const darDeBajaZona = crearDarDeBajaZona(repositorioDeZonasSql);
export const agregarCalleAZona = crearAgregarCalleAZona(repositorioDeZonasSql);
export const quitarCalleDeZona = crearQuitarCalleDeZona(repositorioDeZonasSql);
