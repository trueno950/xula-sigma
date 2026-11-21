/**
 * Lo que la pantalla `/marca` le dice a la operadora, en un solo lugar: los
 * dos catalogos cerrados que viajan por la URL —el de la pagina (`?error=`)
 * y el del archivo del escudo, que se pinta junto al campo— y las claves de
 * `?ok=`.
 *
 * Nada de aca es texto de una excepcion (S8): son oraciones escritas para
 * quien opera un ayuntamiento, y la accion que traduce un error solo puede
 * elegir un **codigo**. La URL nunca lleva la oracion, y por eso la pantalla
 * la pone: un `?error=` que no esta en el catalogo no se pinta (S4).
 */

export const CLAVES_DE_CONFIRMACION_DE_MARCA = [
  "colores-guardados",
  "colores-restablecidos",
  "escudo-actualizado",
] as const;

export type ClaveDeConfirmacionDeMarca =
  (typeof CLAVES_DE_CONFIRMACION_DE_MARCA)[number];

export const MENSAJE_DE_CONFIRMACION_DE_MARCA: Record<
  ClaveDeConfirmacionDeMarca,
  string
> = {
  "colores-guardados": "Colores guardados.",
  "colores-restablecidos": "Se volvió a los colores por defecto de XULA.",
  "escudo-actualizado": "Escudo actualizado.",
};

export const CLAVES_DE_ERROR_DE_MARCA = [
  "sin-permiso",
  "color-invalido",
  "colores-incompletos",
  "colores-no-guardados",
  "restablecimiento-no-hecho",
  "restablecimiento-sin-confirmar",
] as const;

export type ClaveDeErrorDeMarca = (typeof CLAVES_DE_ERROR_DE_MARCA)[number];

export const MENSAJES_DE_ERROR_DE_MARCA: Record<ClaveDeErrorDeMarca, string> = {
  "sin-permiso":
    "Su rol no tiene permiso para cambiar la marca del ayuntamiento.",
  /**
   * Con el texto automatico (S2), todo color medible alcanza 4.5:1 contra
   * blanco o contra negro. Lo que esta oracion cubre es el color que no se
   * puede medir, y el texto no lo nombra porque la operadora no puede
   * distinguirlos: para ella los dos son "ese color no sirve".
   */
  "color-invalido":
    "El color elegido no deja leer el texto. Elija uno más claro u oscuro.",
  "colores-incompletos": "Elija un color primario y uno de acento.",
  "colores-no-guardados":
    "No se pudieron guardar los colores. Intente de nuevo.",
  "restablecimiento-no-hecho":
    "No se pudieron restablecer los colores. Intente de nuevo.",
  "restablecimiento-sin-confirmar":
    "Para restablecer los colores, marque la casilla de confirmación.",
};

export const esClaveDeConfirmacion = (
  valor: string,
): valor is ClaveDeConfirmacionDeMarca =>
  (CLAVES_DE_CONFIRMACION_DE_MARCA as readonly string[]).includes(valor);

export const esClaveDeErrorDeMarca = (
  valor: string,
): valor is ClaveDeErrorDeMarca =>
  (CLAVES_DE_ERROR_DE_MARCA as readonly string[]).includes(valor);

/**
 * Los rechazos del escudo (S9). Van aparte de los de la pagina porque el
 * error de un archivo se pinta **junto al campo** y no como aviso suelto: la
 * operadora tiene que poder leerlo donde esta el campo que lo causo.
 */
export const CLAVES_DE_ERROR_DE_ESCUDO = [
  "escudo-archivo-faltante",
  "escudo-vacio",
  "escudo-pesado",
  "escudo-no-png",
  "escudo-dimensiones",
  "escudo-sin-permiso",
  "escudo-no-guardado",
] as const;

export type ClaveDeErrorDeEscudo = (typeof CLAVES_DE_ERROR_DE_ESCUDO)[number];

/**
 * Las mismas oraciones que el escudo ya decia por `ActionResult`, ahora
 * elegidas por codigo. La de las dimensiones nombra el rango que
 * `domain/png.ts` acepta de verdad —80x80 a 2048x2048— y no una regla que el
 * codigo no impone.
 */
export const MENSAJES_DE_ERROR_DE_ESCUDO: Record<ClaveDeErrorDeEscudo, string> =
  {
    "escudo-archivo-faltante": "Elija un archivo PNG.",
    "escudo-vacio": "El archivo está vacío.",
    "escudo-pesado": "El archivo pesa más de 1 MiB.",
    "escudo-no-png": "El archivo no es un PNG válido.",
    "escudo-dimensiones":
      "El escudo debe medir entre 80x80 y 2048x2048 píxeles.",
    "escudo-sin-permiso": MENSAJES_DE_ERROR_DE_MARCA["sin-permiso"],
    "escudo-no-guardado": "No se pudo subir el archivo. Intente de nuevo.",
  };

export const esClaveDeErrorDeEscudo = (
  valor: string,
): valor is ClaveDeErrorDeEscudo =>
  (CLAVES_DE_ERROR_DE_ESCUDO as readonly string[]).includes(valor);

export type ParametrosDeMarca = {
  /** El aviso de la pagina, como codigo: la oracion la pone la pantalla. */
  error: ClaveDeErrorDeMarca | undefined;
  /** El rechazo del archivo, que se pinta junto al campo. */
  escudo: ClaveDeErrorDeEscudo | undefined;
  ok: ClaveDeConfirmacionDeMarca | undefined;
};

/**
 * La lectura de `?error=` y `?ok=`: los dos son vocabulario cerrado. Lo que
 * no esta en ninguno de los dos catalogos no pinta nada —ni un aviso, ni el
 * texto que alguien haya escrito en la barra de direcciones—. Un fallo y una
 * confirmacion juntos no pasan solos: el error gana, igual que en zonas.
 */
export const leerParametrosDeMarca = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeMarca => {
  const parametro =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const escudo =
    parametro && esClaveDeErrorDeEscudo(parametro) ? parametro : undefined;
  const error =
    parametro && !escudo && esClaveDeErrorDeMarca(parametro)
      ? parametro
      : undefined;
  const ok = searchParams.ok;

  return {
    error,
    escudo,
    ok:
      !error && !escudo && typeof ok === "string" && esClaveDeConfirmacion(ok)
        ? ok
        : undefined,
  };
};
