import { revisar } from "./index";
import type { Archivo } from "./tipos";

/**
 * Ayudantes compartidos por los tests de las reglas.
 *
 * Viven en su propio archivo y no en cada suite para que el corte por tema
 * —que salio del limite de 200 lineas por archivo— no obligue a copiar los
 * mismos cuatro renglones tres veces. Esa copia es el antipatron 23.
 */
export const archivo = (ruta: string, contenido: string): Archivo => ({
  ruta,
  contenido,
});

export const hallazgosDe = (id: string, archivos: Archivo[]) =>
  revisar(archivos).filter((hallazgo) => hallazgo.regla === id);
