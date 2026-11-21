import { CONTRASTE_MINIMO, contraste, textoSobre } from "@/shared/marca";

/**
 * El acento medido (S3): el color guardado —o el de por defecto—, el texto que
 * mas contrasta contra el y la razon entre los dos.
 *
 * Vive aca y no en `shared/marca` porque es una decision de esta pantalla:
 * `shared/marca` ya dice como se mide (`contraste`, `textoSobre`) y cual es el
 * piso del sistema, y esto solo elige el par que la muestra va a pintar.
 *
 * El hallazgo M3 fue un chip de acento con **blanco** encima: 3.01:1 en un
 * numero y 1.61:1 en el otro. El acento no es un color de texto —el design
 * system lo prohibe— pero la muestra tampoco puede insinuar que lo es.
 */

/**
 * El fallback de `--accent` en `src/app/globals.css`. Es una copia y por eso
 * `acentoDeLaMarca.test.ts` lee el CSS y la compara: una copia que diverge
 * mediria el contraste contra un color que la pagina no pinta.
 */
export const ACENTO_POR_DEFECTO = "oklch(0.55 0.1 25)";

/** El acento que el municipio ve: el suyo o el de XULA. */
export const acentoGuardado = (guardado: string | undefined): string =>
  guardado ?? ACENTO_POR_DEFECTO;

export type AcentoMedido = {
  color: string;
  /** El texto que va encima: el que mide mas contraste, no un token fijo. */
  texto: string;
  razon: number;
};

/**
 * `null` cuando el color no se puede medir o no llega al piso: en ese caso la
 * muestra se pinta **solo como relleno**, sin texto encima. No es un caso que
 * `validarMarca` deje guardar, pero la muestra no puede prometer un texto
 * legible sobre algo que no sabe medir.
 */
export const medirAcento = (
  guardado: string | undefined,
): AcentoMedido | null => {
  const color = acentoGuardado(guardado);
  const texto = textoSobre(color);

  if (!texto) return null;

  const razon = contraste(color, texto);

  if (razon === null || razon < CONTRASTE_MINIMO) return null;

  return { color, texto, razon };
};

/** La razon como la lee una persona en la pantalla: `5.6:1`. */
export const razonFormateada = (razon: number): string =>
  `${razon.toFixed(1)}:1`;
