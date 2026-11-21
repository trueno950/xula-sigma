"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarEscudo } from "../../composicion";
import { type MotivoDeRechazo, validarPng } from "../../domain";
import type { ClaveDeErrorDeEscudo } from "../mensajesDeMarca";
import { rutaDeMarca } from "./navegacionDeMarca";

/**
 * Subir el escudo (S6).
 *
 * Es el `action` de un `<form>` nativo con `multipart/form-data`, y esa es
 * toda la diferencia con un Server Action de `useActionState`: sin
 * JavaScript el navegador manda el POST con el archivo adentro, y el
 * rechazo no puede volver como `ActionResult` porque no hay componente
 * cliente que lo lea. Viaja como **codigo** en la URL y la pantalla lo
 * traduce (`mensajesDeMarca.ts`), asi que el mensaje es el mismo con y sin
 * JavaScript y nunca es el texto de la excepcion (S9). Es la excepcion de
 * formulario nativo de `AGENTS.md`.
 *
 * Los pasos 3-4 del camino de escritura —bytes, PUT al almacen, transaccion,
 * borrado diferido— siguen viviendo en `cambiarEscudo`, cableado por
 * `composicion.ts`: el archivo no toca el filesystem ni viaja a ningun otro
 * lado que el almacen de objetos (regla 10).
 */

/**
 * Solo la forma del dato. El tamano y el formato los decide `validarPng`
 * sobre los bytes ya leidos: este esquema no conoce la firma PNG ni el
 * `IHDR`, y duplicar aca el limite era lo que dejaba dos listas de motivos.
 */
const esquemaDeEntrada = z.instanceof(File, { message: "Suba un archivo." });

/**
 * El motivo del sniffer, que es vocabulario del dominio, traducido al
 * vocabulario cerrado que puede viajar en la URL. `validarPng` corre aca
 * —para poder elegir el codigo— y otra vez adentro del caso de uso, que es
 * la reja de verdad: es puro, y la alternativa era mapear el texto de la
 * excepcion de vuelta a un codigo.
 */
const CLAVES_DE_RECHAZO: Record<MotivoDeRechazo, ClaveDeErrorDeEscudo> = {
  VACIO: "escudo-vacio",
  DEMASIADO_GRANDE: "escudo-pesado",
  NO_ES_PNG: "escudo-no-png",
  SIN_IHDR: "escudo-no-png",
  DIMENSIONES: "escudo-dimensiones",
};

const claveDelFallo = (error: unknown): ClaveDeErrorDeEscudo => {
  if (error instanceof NoAutorizadoError) return "escudo-sin-permiso";

  console.error("[marca] cambio de escudo fallo", datosSegurosDeError(error));

  return "escudo-no-guardado";
};

export async function cambiarEscudoAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse(formData.get("escudo"));

  if (!analisis.success) {
    return redirect(rutaDeMarca({ error: "escudo-archivo-faltante" }));
  }

  // El ayuntamientoId, el rol y el origen salen del contexto de sesion,
  // nunca de `formData`: un Server Action es superficie publica y recibe lo
  // que el cliente quiera mandarle.
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const bytes = new Uint8Array(await analisis.data.arrayBuffer());
  const veredicto = validarPng(bytes);

  if (!veredicto.ok) {
    return redirect(
      rutaDeMarca({ error: CLAVES_DE_RECHAZO[veredicto.motivo] }),
    );
  }

  try {
    await cambiarEscudo({ bytes }, contexto);
  } catch (error) {
    return redirect(rutaDeMarca({ error: claveDelFallo(error) }));
  }

  revalidatePath("/marca");
  revalidatePath("/acceso");

  redirect(rutaDeMarca({ ok: "escudo-actualizado" }));
}
