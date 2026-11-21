"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  contextoActual,
  generarClaveTemporal,
  reactivarUsuario,
} from "@/shared/auth";
import { ReactivacionSinConfirmarError } from "../../domain";
import { intentarGuardarClaveMostrada } from "../claveTemporalEnCookie";
import { recordarDestinatarioDeLaClave } from "../destinatarioDeLaClave";
import type { CodigoDeError } from "../mensajesDeError";
import { codigoDeErrorParaLaOperadora } from "./codigoDeError";
import { rutaDeUsuarios } from "./destinoDeUsuarios";

/**
 * S3: devuelve al panel una cuenta que estaba de baja, con una temporal
 * nueva. **El transporte de la clave es el del restablecimiento, no una
 * variante**: la accion genera la clave, el caso de uso guarda su hash con la
 * marca de S1, y la que la pantalla muestra es exactamente esa —cookie
 * httpOnly de 120 segundos, un token opaco en la URL y la tarjeta de
 * «Ya la anoté» con «Copiar»—. Nada de una clave en la URL ni en el log.
 *
 * La diferencia con `restablecerContraseniaAction` son dos cosas: el motivo
 * (`reactivacion`, que la tarjeta escribe) y la confirmacion, que se exige
 * dos veces —la casilla del formulario y otra vez aca— porque reactivar deja
 * a la persona adentro del panel con una clave que la operadora va a dictar.
 * Por que el servidor la vuelve a exigir: nota de `darDeBajaUsuarioAction` en
 * AGENTS.md.
 *
 * Mismo borde que las otras tres acciones: `<form>` nativo y `redirect` con
 * el codigo del error, que la pantalla traduce (`mensajesDeError.ts`). No
 * devuelve `ActionResult<T>` porque nadie podria leerlo sin JavaScript.
 */

const esquemaDeEntrada = z.object({ usuarioId: z.uuid() });

/**
 * La casilla, fuera del esquema por la misma razon que en la baja: un valor
 * distinto de `si` no es un formulario mal formado —es «no confirmo»— y ese
 * rechazo tiene su propio mensaje.
 */
const exigirConfirmacionDeReactivacion = (valor: unknown): void => {
  if (valor !== "si") throw new ReactivacionSinConfirmarError();
};

const volverAlListado = (codigo: CodigoDeError): never =>
  redirect(rutaDeUsuarios({ error: codigo }));

export async function reactivarUsuarioAction(
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
    exigirConfirmacionDeReactivacion(formData.get("confirmar"));
    await reactivarUsuario(contexto, { usuarioId, nuevaClave: claveTemporal });
  } catch (error) {
    volverAlListado(
      codigoDeErrorParaLaOperadora(
        error,
        "reactivacion",
        "generico-reactivacion",
      ),
    );
    return;
  }

  // La cuenta ya volvio a estar activa: el listado se revalida aunque la
  // clave no se pueda mostrar, porque la reactivacion ocurrio igual.
  revalidatePath("/usuarios");

  const mostrada = await intentarGuardarClaveMostrada({
    motivo: "reactivacion",
    usuarioId,
    clave: claveTemporal,
  });

  if (!mostrada) {
    volverAlListado("clave-no-mostrada-reactivacion");
    return;
  }

  // De quien era, para cuando la clave ya no se pueda mostrar (S11 de
  // `usuarios-ux`): la pantalla la nombra y ofrece restablecerla.
  await recordarDestinatarioDeLaClave({ token: mostrada.token, usuarioId });

  redirect(rutaDeUsuarios({ clave: mostrada.token, ok: "reactivacion" }));
}
