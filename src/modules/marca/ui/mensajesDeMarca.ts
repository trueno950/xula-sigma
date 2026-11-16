/**
 * Lo que la pantalla `/marca` le dice a la operadora, en un solo lugar: el
 * mensaje que viaja por `?error=`, el que arma cada clave de `?ok=` y el
 * aviso de permiso de la pagina.
 *
 * Nada de aca es texto de una excepcion (S8): son oraciones escritas para
 * quien opera un ayuntamiento, y la accion que traduce un error solo puede
 * elegir una de estas. Un `?error=` de la URL nunca se pinta tal cual.
 */

export const CLAVES_DE_CONFIRMACION_DE_MARCA = [
  "colores-guardados",
  "colores-restablecidos",
] as const;

export type ClaveDeConfirmacionDeMarca =
  (typeof CLAVES_DE_CONFIRMACION_DE_MARCA)[number];

export const MENSAJE_DE_CONFIRMACION_DE_MARCA: Record<
  ClaveDeConfirmacionDeMarca,
  string
> = {
  "colores-guardados": "Colores guardados.",
  "colores-restablecidos": "Se volvió a los colores por defecto de XULA.",
};

export const MENSAJES_DE_ERROR_DE_MARCA = {
  /**
   * Con el texto automatico (S2), todo color medible alcanza 4.5:1 contra
   * blanco o contra negro. Lo que esta oracion cubre es el color que no se
   * puede medir, y el texto no lo nombra porque la operadora no puede
   * distinguirlos: para ella los dos son "ese color no sirve".
   */
  colorInvalido:
    "El color elegido no deja leer el texto. Elija uno más claro u oscuro.",
  formularioIncompleto: "Elija un color primario y uno de acento.",
  guardadoFallido: "No se pudieron guardar los colores. Intente de nuevo.",
  restablecimientoFallido:
    "No se pudieron restablecer los colores. Intente de nuevo.",
  sinPermiso: "Su rol no tiene permiso para cambiar la marca del ayuntamiento.",
} as const;

export const esClaveDeConfirmacion = (
  valor: string,
): valor is ClaveDeConfirmacionDeMarca =>
  (CLAVES_DE_CONFIRMACION_DE_MARCA as readonly string[]).includes(valor);

export type ParametrosDeMarca = {
  error: string | undefined;
  ok: ClaveDeConfirmacionDeMarca | undefined;
};

/**
 * La lectura de `?error=` y `?ok=`. Un `?ok=` que no es de este vocabulario
 * no pinta nada; un `?error=` se pinta tal cual porque quien lo escribe es
 * la accion, y siempre con una de las oraciones de arriba. Un fallo y una
 * confirmacion juntos no pasan solos: el error gana, igual que en zonas.
 */
export const leerParametrosDeMarca = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeMarca => {
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const ok = searchParams.ok;

  return {
    error,
    ok:
      !error && typeof ok === "string" && esClaveDeConfirmacion(ok)
        ? ok
        : undefined,
  };
};
