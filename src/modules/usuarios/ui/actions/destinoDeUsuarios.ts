import { z } from "zod";
import { CODIGOS_DE_ERROR, type CodigoDeError } from "../mensajesDeError";

/**
 * El destino de las acciones del panel de usuarios.
 *
 * Pura y exportada para poder probar el destino sin `redirect`, que es de
 * Next y no nuestro —misma forma que `volverAlArbol` de territorio—. Todo lo
 * que viaja en la URL es vocabulario cerrado: la confirmacion, el token de
 * la clave mostrada y el **codigo** de error, que la pantalla traduce
 * (`mensajesDeError.ts`). Nunca texto del operador.
 *
 * `clave` es el token de la contrasenia mostrada, **no la contrasenia**
 * (S4). Sin `clave` la pantalla no lee la cookie.
 */

const CONFIRMACIONES = ["alta", "restablecimiento", "baja"] as const;

export type ConfirmacionDeUsuarios = (typeof CONFIRMACIONES)[number];

export type ParametrosDeUsuarios = {
  clave?: string | undefined;
  ok?: ConfirmacionDeUsuarios | undefined;
  error?: CodigoDeError | undefined;
};

const CLAVES_DE_CONSULTA = ["clave", "ok", "error"] as const;

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

export const rutaDelAltaDeUsuario = (error?: CodigoDeError): string =>
  error ? `${RUTA_DEL_ALTA}?error=${error}` : RUTA_DEL_ALTA;

/**
 * Lo que la pantalla acepta de la URL. Un `?clave=a&clave=b` llega como
 * arreglo —Next no lo impide— y un `ok` o un `error` que no estan en su
 * vocabulario no significan nada: se descartan y la pantalla cae al listado
 * limpio en vez de un 500 o de pintar texto ajeno sobre una URL publica,
 * mismo criterio que `app/(panel)/padron/(lista)/page.tsx`.
 */
export const esquemaDeParametros = z.object({
  clave: z.uuid().optional().catch(undefined),
  ok: z.enum(CONFIRMACIONES).optional().catch(undefined),
  error: z.enum(CODIGOS_DE_ERROR).optional().catch(undefined),
});
