"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { registrarIntervencion } from "../../composicion";
import { TIPOS_DE_INTERVENCION } from "../../domain";

/**
 * Borde de sesion del alta de la bandeja (S1 de
 * `intervenciones-trazabilidad`). Formulario nativo sin `use client`: la
 * excepcion de `AGENTS.md`, seccion Server Actions, con su fila en la tabla.
 *
 * No recibe `ayuntamientoId`: sale de `contextoActual()`, que es la sesion del
 * servidor (regla 4). El permiso es `puedeAdministrarIntervenciones` y no
 * `puedeEscribir`, como pide S1: la bandeja programa y administra trabajo, no
 * captura de mostrador.
 */

const esquemaDeEntrada = z.strictObject({
  tipo: z.enum(TIPOS_DE_INTERVENCION),
  fechaDeOcurrencia: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  lugarId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid().optional(),
  descripcion: z.string().trim().min(10).max(1000),
});

type EntradaDelAlta = z.infer<typeof esquemaDeEntrada>;

const MENSAJE_FORMULARIO_INVALIDO = "Revise los datos de la intervención.";
const MENSAJE_GENERICO =
  "No se pudo registrar la intervención. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/intervenciones/alta?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) {
    return "Ese lugar o esa calle no existe en su municipio.";
  }
  if (error instanceof ValidacionError) return error.message;
  if (error instanceof TenantNoResueltoError) {
    return "No se pudo determinar el ayuntamiento del acceso.";
  }

  console.error(
    "[intervenciones] alta desde la bandeja fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

/**
 * El alta con su guarda de rol, en un solo lugar: la accion la invoca dentro
 * del `try` que ya traduce cualquier rechazo al mensaje de la operadora.
 */
async function registrarComoAdministracion(
  entrada: EntradaDelAlta,
  contexto: ContextoActual,
): Promise<string> {
  if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
    throw new NoAutorizadoError();
  }

  return registrarIntervencion(
    {
      tipo: entrada.tipo,
      fechaDeOcurrencia: entrada.fechaDeOcurrencia,
      lugarId: entrada.lugarId,
      calleId: entrada.calleId ?? null,
      reporteId: null,
      descripcion: entrada.descripcion,
    },
    contexto,
  );
}

const leerEntrada = (formData: FormData): EntradaDelAlta => {
  const analisis = esquemaDeEntrada.safeParse({
    tipo: formData.get("tipo"),
    fechaDeOcurrencia: formData.get("fechaDeOcurrencia"),
    lugarId: formData.get("lugarId"),
    calleId: formData.get("calleId") || undefined,
    descripcion: formData.get("descripcion"),
  });

  if (!analisis.success) {
    return redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
  }

  return analisis.data;
};

export async function altaDeIntervencionAction(
  formData: FormData,
): Promise<void> {
  const entrada = leerEntrada(formData);

  const contexto = await contextoActual().catch((error) =>
    redirigirConError(mensajeDeError(error)),
  );
  if (!contexto) redirect("/acceso");

  let id: string;

  try {
    id = await registrarComoAdministracion(entrada, contexto);
  } catch (error) {
    return redirigirConError(mensajeDeError(error));
  }

  revalidatePath("/intervenciones");
  redirect(`/intervenciones/${id}`);
}
