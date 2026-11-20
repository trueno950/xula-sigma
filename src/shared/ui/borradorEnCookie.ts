import { cookies } from "next/headers";

/**
 * Lo que el operador capturó en un formulario que el servidor rechazó, entre
 * el redirect de la Server Action y la página que lo vuelve a mostrar
 * (decisión S4 de `odd/tasks/territorio-mostrador.md`, S8 de
 * `odd/tasks/intervenciones-ux.md`).
 *
 * En la URL no puede ir: son datos de una persona que quedarían en los logs
 * de acceso del servidor, que `AGENTS.md` prohíbe. Va en una cookie httpOnly,
 * `SameSite=Lax`, solo para la ruta del formulario y de 120 segundos.
 *
 * Un solo uso, sin poder borrarla al leerla: en Next.js 16 un Server
 * Component lee cookies pero no las escribe ni las borra -solo una Server
 * Function o un Route Handler-. Por eso la cookie lleva un token al azar y el
 * redirect del rechazo lleva ese token y nada más (`?borrador=`): la página
 * la aplica solo si el token de la URL coincide, así que cualquier otra
 * navegación la ignora; el siguiente envío de ese formulario la reemplaza
 * (otro rechazo) o la borra (éxito), y si no hay envío vence sola.
 *
 * Vive en `shared/ui` porque el mecanismo no es de un módulo: lo que cambia
 * por formulario es la forma de lo capturado, que cada módulo decide en su
 * propio `borrador*`. No se exporta desde el barril: importa `next/headers`.
 */

/** Dónde vive un borrador: el nombre de la cookie y la ruta que la acota. */
export type EspacioDeBorrador = {
  cookie: string;
  ruta: string;
};

/** Lo mínimo que un borrador tiene para poder nombrarse desde la URL. */
export type BorradorConToken = { token: string };

const VIDA_EN_SEGUNDOS = 120;

export const nuevoToken = (): string => crypto.randomUUID();

export const guardarBorrador = async <T extends BorradorConToken>(
  espacio: EspacioDeBorrador,
  borrador: T,
): Promise<void> => {
  (await cookies()).set(espacio.cookie, JSON.stringify(borrador), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: espacio.ruta,
    maxAge: VIDA_EN_SEGUNDOS,
  });
};

export const descartarBorrador = async (
  espacio: EspacioDeBorrador,
): Promise<void> => {
  const almacen = await cookies();
  if (almacen.has(espacio.cookie)) {
    almacen.delete({ name: espacio.cookie, path: espacio.ruta });
  }
};

/** Sin token en la URL no se lee la cookie: ninguna otra visita la toca. */
export const borradorDeLaPeticion = async <T extends BorradorConToken>(
  espacio: EspacioDeBorrador,
  token: string | undefined,
  leer: (valor: string | undefined) => T | null,
): Promise<T | null> => {
  if (!token) return null;
  const borrador = leer((await cookies()).get(espacio.cookie)?.value);

  return borrador?.token === token ? borrador : null;
};
