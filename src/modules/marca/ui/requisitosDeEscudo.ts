/**
 * Lo que la pantalla dice del archivo **antes** de elegirlo (S8). Nombra el
 * rango que `domain/png.ts` acepta de verdad —80x80 a 2048x2048 por lado, no
 * «cuadrado»— y el tope de peso que aplica la accion: lo que no se cumple no
 * se promete.
 *
 * Vive aparte de `FormularioDeEscudo` porque lo leen los dos lados del
 * formulario: el servidor, que lo pinta, y la hoja cliente del campo, que lo
 * ata al `<input>` por `aria-describedby`.
 */
export const REQUISITOS_DE_ESCUDO =
  "Archivo PNG de hasta 1 MiB, entre 80x80 y 2048x2048 píxeles.";
