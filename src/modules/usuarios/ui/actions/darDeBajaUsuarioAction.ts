"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual, darDeBajaUsuario } from "@/shared/auth";
import { codigoDeErrorParaLaOperadora } from "./codigoDeError";
import { rutaDeUsuarios } from "./destinoDeUsuarios";

/**
 * S6: la baja logica, con el caso de uso que ya existe. No borra la fila ni
 * toca la bitacora ni los documentos que la persona firmo; y quien queda de
 * baja pierde el acceso: el caso de uso revoca sus sesiones en la misma
 * transaccion, `soloSiSigueActiva` le cierra el alta de nuevas y
 * `contextoActual` deja de resolverle contexto
 * (`shared/auth/administracionDeUsuarios.ts`, `instancia.ts`, `contexto.ts`).
 *
 * Mismo borde que las otras dos acciones del panel: `<form>` nativo y
 * `redirect` con el codigo del error, sin `ActionResult<T>` que nadie
 * podria leer.
 */

const esquemaDeEntrada = z.object({ usuarioId: z.uuid() });

export async function darDeBajaUsuarioAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    usuarioId: formData.get("usuarioId"),
  });

  if (!analisis.success) {
    redirect(rutaDeUsuarios({ error: "sin-destinatario" }));
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaUsuario(contexto, { usuarioId: analisis.data.usuarioId });
  } catch (error) {
    redirect(
      rutaDeUsuarios({
        error: codigoDeErrorParaLaOperadora(error, "baja", "generico-baja"),
      }),
    );
    return;
  }

  revalidatePath("/usuarios");
  redirect(rutaDeUsuarios({ ok: "baja" }));
}
