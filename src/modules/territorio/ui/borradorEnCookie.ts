import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  type BorradorDeDomicilio,
  camposDelFormulario,
  codificarBorrador,
  type DestinoDeBorrador,
  decodificarBorrador,
  seRecortaAlGuardar,
} from "./borradorDeDomicilio";

/**
 * Donde vive lo capturado entre el rechazo de un formulario de domicilio y
 * la pagina que lo vuelve a mostrar (decision S4 de
 * `odd/tasks/territorio-mostrador.md`).
 *
 * En la URL no puede ir: el domicilio de una persona quedaria en los logs
 * de acceso del servidor, que `AGENTS.md` prohibe. Va en una cookie
 * httpOnly, `SameSite=Lax`, solo para `/territorio` y de 120 segundos.
 *
 * Un solo uso, sin poder borrarla al leerla: en Next.js 16 un Server
 * Component lee cookies pero no las escribe ni las borra -solo una Server
 * Function o un Route Handler-. Por eso la cookie lleva un token al azar y
 * el redirect del rechazo lleva ese token y nada mas (`?borrador=`): la
 * pagina la aplica solo si el token de la URL coincide, asi que cualquier
 * otra navegacion la ignora; el siguiente envio de estos formularios la
 * reemplaza (otro rechazo) o la borra (exito), y si no hay envio vence sola.
 */
const NOMBRE = "borrador-de-domicilio";
const RUTA = "/territorio";

const nuevoBorrador = (
  destino: DestinoDeBorrador,
  formData: FormData,
  nombreDeZona: "lugarId" | "zonaId",
): BorradorDeDomicilio => ({
  token: randomUUID(),
  destino,
  campos: camposDelFormulario(formData, nombreDeZona),
  ...(seRecortaAlGuardar(formData, nombreDeZona) ? { recortado: true } : {}),
});

export const borradorDeAlta = (formData: FormData): BorradorDeDomicilio =>
  nuevoBorrador({ formulario: "alta" }, formData, "lugarId");

export const borradorDeCorreccion = (
  formData: FormData,
  domicilioId: string,
): BorradorDeDomicilio =>
  nuevoBorrador({ formulario: "correccion", domicilioId }, formData, "zonaId");

export const guardarBorrador = async (
  borrador: BorradorDeDomicilio,
): Promise<void> => {
  (await cookies()).set(NOMBRE, codificarBorrador(borrador), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: RUTA,
    maxAge: 120,
  });
};

export const descartarBorrador = async (): Promise<void> => {
  const almacen = await cookies();
  if (almacen.has(NOMBRE)) almacen.delete({ name: NOMBRE, path: RUTA });
};

/** Sin token en la URL no se lee la cookie: ninguna otra visita la toca. */
export const borradorDeLaPeticion = async (
  token: string | undefined,
): Promise<BorradorDeDomicilio | null> => {
  if (!token) return null;
  const borrador = decodificarBorrador((await cookies()).get(NOMBRE)?.value);

  return borrador?.token === token ? borrador : null;
};
