"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import type { UsuarioDadoDeAlta } from "../../application";
import { altaDeUsuario } from "../../composicion";
import { guardarClaveMostrada } from "../claveTemporalEnCookie";
import type { CodigoDeError } from "../mensajesDeError";
import { codigoDeErrorParaLaOperadora } from "./codigoDeError";
import { rutaDelAltaDeUsuario, rutaDeUsuarios } from "./destinoDeUsuarios";

/**
 * El alta de una cuenta del ayuntamiento (S3 y S4).
 *
 * `FormularioDeAltaDeUsuario` es el `<form action={...}>` nativo de esta
 * accion: no hay `"use client"` de por medio y el error viaja por
 * `redirect` + `searchParams`, la excepcion de `AGENTS.md` en la seccion
 * Server Actions. Por eso no devuelve `ActionResult<T>`: nadie podria
 * leerlo.
 *
 * La contrasenia temporal no vuelve por el redirect: se guarda en una
 * cookie httpOnly y el redirect lleva solo su token
 * (`claveTemporalEnCookie.ts`).
 */

const esquemaDeEntrada = z.object({
  nombre: z.string().trim().min(3).max(120),
  email: z.email(),
  rol: z.string().trim(),
});

const redirigirAlAlta = (codigo: CodigoDeError): never =>
  redirect(rutaDelAltaDeUsuario(codigo));

export async function altaDeUsuarioAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
  });

  // `redirigirAlAlta` esta tipada `never` porque `redirect` lo esta, pero
  // TypeScript no angosta `analisis` a traves de esa llamada: hace falta el
  // `return` explicito, mismo caso que `altaDePersonaAction`.
  if (!analisis.success) {
    redirigirAlAlta("formulario");
    return;
  }

  /**
   * El `<select>` tiene un marcador sin valor (`CampoDeLista`), asi que el
   * rol vacio es un formulario incompleto y no un rol invalido: decirle
   * «faltan el nombre o el correo» a quien se olvido del rol manda a
   * revisar dos campos que estan bien.
   */
  if (!analisis.data.rol) {
    redirigirAlAlta("sin-rol");
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  let alta: UsuarioDadoDeAlta;

  try {
    alta = await altaDeUsuario(contexto, analisis.data);
  } catch (error) {
    redirigirAlAlta(
      codigoDeErrorParaLaOperadora(error, "alta", "generico-alta"),
    );
    return;
  }

  const mostrada = await guardarClaveMostrada({
    motivo: "alta",
    usuarioId: alta.usuarioId,
    clave: alta.claveTemporal,
  });

  revalidatePath("/usuarios");
  redirect(rutaDeUsuarios({ clave: mostrada.token, ok: "alta" }));
}
