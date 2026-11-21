import type { CodigoDeDescarga } from "@/app/exportacion/codigosDeDescarga";

export {
  CODIGOS_DE_DESCARGA,
  type CodigoDeDescarga,
  codigoDeDescarga,
} from "@/app/exportacion/codigosDeDescarga";

/**
 * Lo que la pantalla dice cuando la descarga falla (S13), y los numeros que
 * pinta el inventario (S11, S12).
 *
 * Los textos viven aca y no en el borde: el borde solo manda un codigo, y un
 * `?error=` con texto libre no se pinta nunca. Los de `fallo` son los que mas
 * importan: dicen que no se descargo nada y que no hay entrega anotada, que es
 * lo que la operadora necesita saber antes de volver a intentarlo.
 */
export const MENSAJES_DE_DESCARGA: Record<CodigoDeDescarga, string> = {
  "sin-permiso":
    "Su rol ya no permite descargar los datos del ayuntamiento. Vuelva a entrar; si el cambio no era suyo, avise al administrador municipal.",
  "no-encontrado":
    "No se encontró el municipio de esta sesión. Vuelva a entrar al panel.",
  fallo:
    "No se pudo armar el archivo. No se descargó nada y no se anotó ninguna entrega. Vuelva a intentarlo; si vuelve a fallar, avise al administrador municipal y dígale la hora en que lo intentó.",
};

const FILAS = new Intl.NumberFormat("es-MX");

export const formatearFilas = (filas: number): string => FILAS.format(filas);

const TAMANOS = [
  { desde: 1024 * 1024, sufijo: "MB", factor: 1024 * 1024 },
  { desde: 1024, sufijo: "KB", factor: 1024 },
] as const;

/** El tamano del ZIP, en la unidad que se lee de un vistazo (S12). */
export const formatearTamano = (bytes: number): string => {
  for (const { desde, sufijo, factor } of TAMANOS) {
    if (bytes < desde) continue;

    const valor = bytes / factor;

    return `${valor < 10 ? valor.toFixed(1) : Math.round(valor)} ${sufijo}`;
  }

  return `${bytes} B`;
};
