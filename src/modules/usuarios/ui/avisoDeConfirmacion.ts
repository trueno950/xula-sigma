import type { ConfirmacionDeUsuarios } from "./actions/destinoDeUsuarios";

/**
 * Lo que la pantalla anuncia al volver de una accion, y con que tono (S11 de
 * `usuarios-ux`, hallazgo R1 de la auditoria).
 *
 * Una confirmacion que existe **por una contrasenia** no se puede anunciar
 * sola: la razon del aviso es que la operadora acaba de recibir una clave
 * nueva, y si esa clave ya no esta en pantalla —recargo, se le vencio la
 * cookie de 120 segundos, volvio con el boton de atras— el exito la deja sin
 * la contrasenia y sin saber que tiene que volver a restablecer. El texto lo
 * dice, y el tono deja de ser de exito.
 *
 * **La baja no esta aca** (S13 y S14): su aviso dice de quien y desde cuando,
 * y solo existe si el proxy consumo su cookie en esta misma peticion
 * (`AvisoDeAccion.tsx`). Un `?ok=baja` escrito a mano en la barra de
 * direcciones no anuncia nada, que es lo mismo que pasa al recargar.
 */
export type AvisoDeConfirmacion = {
  tono: "exito" | "aviso";
  texto: string;
};

/**
 * Solo el alta y el restablecimiento se anuncian por la URL. `baja` esta
 * fuera del mapa a proposito: el aviso de una baja lleva el nombre de una
 * persona y no puede viajar en la URL (S13).
 */
const CONFIRMACIONES: Partial<Record<ConfirmacionDeUsuarios, string>> = {
  alta: "La cuenta quedó creada.",
  restablecimiento: "La contraseña quedó restablecida.",
};

/**
 * Solo el alta y el restablecimiento emiten contrasenia; `baja` no esta en
 * este mapa a proposito, y por eso no puede caer aca.
 */
const SIN_CLAVE_A_LA_VISTA: Partial<Record<ConfirmacionDeUsuarios, string>> = {
  alta: "La cuenta quedó creada, pero la contraseña nueva ya no se puede mostrar. Restablézcala para generar otra.",
  restablecimiento:
    "La contraseña quedó restablecida, pero ya no se puede mostrar. Restablézcala para generar otra.",
};

export const avisoDeConfirmacion = ({
  ok,
  hayClaveVisible,
}: {
  ok: ConfirmacionDeUsuarios | undefined;
  hayClaveVisible: boolean;
}): AvisoDeConfirmacion | null => {
  if (!ok) return null;

  const confirmacion = CONFIRMACIONES[ok];
  if (!confirmacion) return null;

  const sinClave = SIN_CLAVE_A_LA_VISTA[ok];

  if (sinClave && !hayClaveVisible) return { tono: "aviso", texto: sinClave };

  return { tono: "exito", texto: confirmacion };
};
