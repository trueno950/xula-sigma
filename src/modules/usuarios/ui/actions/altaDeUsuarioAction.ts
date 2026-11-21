"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import type { UsuarioDadoDeAlta } from "../../application";
import { altaDeUsuario } from "../../composicion";
import {
  type BorradorDeAltaDeUsuario,
  borradorDelFormulario,
} from "../borradorDeAltaDeUsuario";
import { descartarBorrador, guardarBorrador } from "../borradorEnCookie";
import { intentarGuardarClaveMostrada } from "../claveTemporalEnCookie";
import { recordarDestinatarioDeLaClave } from "../destinatarioDeLaClave";
import { MINIMO_DE_NOMBRE } from "../FormularioDeAltaDeUsuario.textos";
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
 * Todo rechazo vuelve con lo capturado en una cookie httpOnly y solo el token
 * en la URL (S6 de `usuarios-ux`): el nombre y el correo son datos de una
 * persona y no pueden quedar en el log de accesos del servidor. El borrador
 * no lleva contrasenia porque el alta no la captura.
 *
 * La contrasenia temporal no vuelve por el redirect: se guarda en una
 * cookie httpOnly y el redirect lleva solo su token
 * (`claveTemporalEnCookie.ts`).
 */

const esquemaDeEntrada = z.object({
  nombre: z.string().min(MINIMO_DE_NOMBRE).max(120),
  // El correo se pega desde otro lado y suele traer espacios en los bordes.
  email: z.string().pipe(z.email()),
  rol: z.string(),
});

type EntradaDelAlta = z.infer<typeof esquemaDeEntrada>;

type LecturaDelAlta =
  | { valida: true; entrada: EntradaDelAlta }
  | { valida: false; codigo: CodigoDeError };

/**
 * Un campo vacio es un formulario incompleto; uno que trae valor y no cumple
 * su forma tiene su propio mensaje en espaniol, porque el navegador ya no
 * contesta por el suyo (S7 de `usuarios-ux`, ver
 * `FormularioDeAltaDeUsuario.textos.ts`).
 */
const codigoDeFormaInvalida = (
  analisis: z.ZodSafeParseError<EntradaDelAlta>,
  crudos: EntradaDelAlta,
): CodigoDeError => {
  if (!crudos.nombre || !crudos.email) return "formulario";

  return analisis.error.issues.some((issue) => issue.path[0] === "email")
    ? "correo-invalido"
    : "nombre-corto";
};

const leerEntrada = (formData: FormData): LecturaDelAlta => {
  const crudos = {
    nombre: textoDe(formData, "nombre"),
    email: textoDe(formData, "email"),
    rol: textoDe(formData, "rol"),
  };
  const analisis = esquemaDeEntrada.safeParse(crudos);

  if (!analisis.success) {
    return { valida: false, codigo: codigoDeFormaInvalida(analisis, crudos) };
  }

  /**
   * El `<select>` tiene un marcador sin valor (`CampoDeLista`), asi que el
   * rol vacio es un formulario incompleto y no un rol invalido: decirle
   * «faltan el nombre o el correo» a quien se olvido del rol manda a
   * revisar dos campos que estan bien.
   */
  return analisis.data.rol
    ? { valida: true, entrada: analisis.data }
    : { valida: false, codigo: "sin-rol" };
};

/** El valor del campo sin espacios en los bordes; ausente es cadena vacia. */
function textoDe(formData: FormData, campo: keyof EntradaDelAlta): string {
  const valor = formData.get(campo);

  return typeof valor === "string" ? valor.trim() : "";
}

const redirigirConBorrador = async (
  borrador: BorradorDeAltaDeUsuario,
  codigo: CodigoDeError,
): Promise<never> => {
  await guardarBorrador(borrador);
  redirect(rutaDelAltaDeUsuario({ error: codigo, borrador: borrador.token }));
};

export async function altaDeUsuarioAction(formData: FormData): Promise<void> {
  const borrador = borradorDelFormulario(formData);
  const lectura = leerEntrada(formData);

  if (!lectura.valida) {
    return redirigirConBorrador(borrador, lectura.codigo);
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  let alta: UsuarioDadoDeAlta;

  try {
    alta = await altaDeUsuario(contexto, lectura.entrada);
  } catch (error) {
    return redirigirConBorrador(
      borrador,
      codigoDeErrorParaLaOperadora(error, "alta", "generico-alta"),
    );
  }

  // La cuenta ya existe: el borrador sobra —no hay nada que volver a
  // capturar— y el listado se revalida aunque la clave no llegue a guardarse,
  // porque el alta ocurrio igual.
  await descartarBorrador();
  revalidatePath("/usuarios");

  const mostrada = await intentarGuardarClaveMostrada({
    motivo: "alta",
    usuarioId: alta.usuarioId,
    clave: alta.claveTemporal,
  });

  if (!mostrada) {
    redirect(rutaDelAltaDeUsuario({ error: "clave-no-mostrada" }));
  }

  // De quien era la clave, para cuando ya no se pueda mostrar: la pantalla la
  // nombra y ofrece restablecerla otra vez (S11 de `usuarios-ux`).
  await recordarDestinatarioDeLaClave({
    token: mostrada.token,
    usuarioId: alta.usuarioId,
  });

  redirect(rutaDeUsuarios({ clave: mostrada.token, ok: "alta" }));
}
