"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  contextoActual,
  generarClaveTemporal,
  restablecerContrasenia,
} from "@/shared/auth";
import { guardarClaveMostrada } from "../claveTemporalEnCookie";
import type { CodigoDeError } from "../mensajesDeError";
import { codigoDeErrorParaLaOperadora } from "./codigoDeError";
import { rutaDeUsuarios } from "./destinoDeUsuarios";

/**
 * S5: el `ADMIN_MUNICIPAL` le pone una contrasenia nueva a alguien de su
 * ayuntamiento. El caso de uso —que ya existe y hace la traza en la misma
 * transaccion— recibe la clave que esta accion genera, y asi la que queda
 * guardada es exactamente la que la pantalla muestra una sola vez.
 *
 * Mismo borde que `altaDeUsuarioAction`: `<form>` nativo, `redirect` con el
 * codigo del error y la clave por cookie. La eleccion del transporte esta explicada
 * en `claveTemporalEnCookie.ts`.
 */

const esquemaDeEntrada = z.object({ usuarioId: z.uuid() });

const volverAlListado = (codigo: CodigoDeError): never =>
  redirect(rutaDeUsuarios({ error: codigo }));

export async function restablecerContraseniaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    usuarioId: formData.get("usuarioId"),
  });

  if (!analisis.success) {
    volverAlListado("sin-destinatario");
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const { usuarioId } = analisis.data;
  const claveTemporal = generarClaveTemporal();

  try {
    await restablecerContrasenia(contexto, {
      usuarioId,
      nuevaClave: claveTemporal,
    });
  } catch (error) {
    volverAlListado(
      codigoDeErrorParaLaOperadora(
        error,
        "restablecimiento",
        "generico-restablecimiento",
      ),
    );
    return;
  }

  const mostrada = await guardarClaveMostrada({
    motivo: "restablecimiento",
    usuarioId,
    clave: claveTemporal,
  });

  revalidatePath("/usuarios");
  redirect(rutaDeUsuarios({ clave: mostrada.token, ok: "restablecimiento" }));
}
