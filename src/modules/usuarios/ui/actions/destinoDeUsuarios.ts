import { z } from "zod";
import { CODIGOS_DE_ERROR, type CodigoDeError } from "../mensajesDeError";

/**
 * El destino de las acciones del panel de usuarios.
 *
 * Pura y exportada para poder probar el destino sin `redirect`, que es de
 * Next y no nuestro —misma forma que `volverAlArbol` de territorio—. Todo lo
 * que viaja en la URL es vocabulario cerrado: la confirmacion, los tokens de
 * la clave mostrada y del aviso de la baja, y el **codigo** de error, que la
 * pantalla traduce (`mensajesDeError.ts`). Nunca texto del operador, ni un
 * nombre.
 *
 * `clave` y `aviso` son tokens opacos, **no** la contrasenia ni el nombre de
 * una persona (S4 y S13). Sin ellos la pantalla no lee la cookie que los
 * acompaña: recargar o volver con el boton de atras no muestra una clave que
 * ya se vio ni anuncia una baja que no ocurrio en esta visita (S14).
 */

const CONFIRMACIONES = [
  "alta",
  "restablecimiento",
  "baja",
  "reactivacion",
] as const;

export type ConfirmacionDeUsuarios = (typeof CONFIRMACIONES)[number];

export type ParametrosDeUsuarios = {
  clave?: string | undefined;
  aviso?: string | undefined;
  ok?: ConfirmacionDeUsuarios | undefined;
  error?: CodigoDeError | undefined;
};

const CLAVES_DE_CONSULTA = ["clave", "aviso", "ok", "error"] as const;

export const rutaDeUsuarios = (datos: ParametrosDeUsuarios): string => {
  const parametros = new URLSearchParams();

  for (const clave of CLAVES_DE_CONSULTA) {
    const valor = datos[clave];
    if (valor) parametros.set(clave, valor);
  }

  const consulta = parametros.toString();

  return consulta ? `/usuarios?${consulta}` : "/usuarios";
};

const RUTA_DEL_ALTA = "/usuarios/alta";

/**
 * El rechazo del alta vuelve a su formulario con el codigo de error y, cuando
 * hay algo que devolver, con el token de lo capturado (S6 de `usuarios-ux`).
 * El texto capturado nunca viaja aca: va en la cookie httpOnly.
 */
export const rutaDelAltaDeUsuario = (datos: {
  error?: CodigoDeError | undefined;
  borrador?: string | undefined;
}): string => {
  const parametros = new URLSearchParams();
  if (datos.error) parametros.set("error", datos.error);
  if (datos.borrador) parametros.set("borrador", datos.borrador);

  const consulta = parametros.toString();

  return consulta ? `${RUTA_DEL_ALTA}?${consulta}` : RUTA_DEL_ALTA;
};

/**
 * Lo que la pantalla acepta de la URL. Un `?clave=a&clave=b` llega como
 * arreglo —Next no lo impide— y un `ok` o un `error` que no estan en su
 * vocabulario no significan nada: se descartan y la pantalla cae al listado
 * limpio en vez de un 500 o de pintar texto ajeno sobre una URL publica,
 * mismo criterio que `app/(panel)/padron/(lista)/page.tsx`.
 */
export const esquemaDeParametros = z.object({
  clave: z.uuid().optional().catch(undefined),
  aviso: z.uuid().optional().catch(undefined),
  ok: z.enum(CONFIRMACIONES).optional().catch(undefined),
  error: z.enum(CODIGOS_DE_ERROR).optional().catch(undefined),
});
