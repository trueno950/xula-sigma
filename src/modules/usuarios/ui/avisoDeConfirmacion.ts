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
 * La baja no trae clave y no depende de nada en pantalla: confirma siempre.
 */
export type AvisoDeConfirmacion = {
  tono: "exito" | "aviso";
  texto: string;
};

const CONFIRMACIONES: Record<ConfirmacionDeUsuarios, string> = {
  alta: "La cuenta quedó creada.",
  restablecimiento: "La contraseña quedó restablecida.",
  baja: "La persona quedó dada de baja y ya no puede entrar.",
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

  const sinClave = SIN_CLAVE_A_LA_VISTA[ok];

  if (sinClave && !hayClaveVisible) return { tono: "aviso", texto: sinClave };

  return { tono: "exito", texto: CONFIRMACIONES[ok] };
};
