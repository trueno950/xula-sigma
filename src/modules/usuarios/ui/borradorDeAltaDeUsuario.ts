import { z } from "zod";
import { nuevoToken } from "@/shared/ui/borradorEnCookie";

/**
 * Lo que la operadora capturó en el alta de una cuenta cuando el servidor la
 * rechazó (S6 de `odd/tasks/usuarios-ux.md`), para que la página vuelva a
 * llenar el formulario. Viaja en una cookie (`borradorEnCookie.ts`); acá solo
 * se decide su forma.
 *
 * **No hay contraseña**: la genera el sistema al terminar el alta y se muestra
 * una sola vez, así que no se captura y no puede filtrarse por acá.
 *
 * Los techos son el techo de la cookie y no reglas del alta: los mismos
 * `maxLength` que tienen los campos del formulario.
 */
const LARGO_DE_NOMBRE = 120;
const LARGO_DE_CORREO = 160;
const LARGO_DE_ROL = 40;

const esquemaDeCampos = z.object({
  nombre: z.string().max(LARGO_DE_NOMBRE),
  email: z.string().max(LARGO_DE_CORREO),
  rol: z.string().max(LARGO_DE_ROL),
});

const esquemaDeBorrador = z.object({
  token: z.uuid(),
  campos: esquemaDeCampos,
});

export type CamposDeBorradorDeAlta = z.infer<typeof esquemaDeCampos>;
export type BorradorDeAltaDeUsuario = z.infer<typeof esquemaDeBorrador>;

const LARGOS: Record<keyof CamposDeBorradorDeAlta, number> = {
  nombre: LARGO_DE_NOMBRE,
  email: LARGO_DE_CORREO,
  rol: LARGO_DE_ROL,
};

const textoDe = (
  formData: FormData,
  campo: keyof CamposDeBorradorDeAlta,
): string => {
  const valor = formData.get(campo);

  return typeof valor === "string" ? valor.slice(0, LARGOS[campo]) : "";
};

/**
 * Lo capturado en el POST, tal cual y sin recortar: la acción lo guarda antes
 * de validar, así que un formulario inválido también vuelve con sus valores y
 * con los espacios que la operadora pegó sin querer.
 */
export const borradorDelFormulario = (
  formData: FormData,
): BorradorDeAltaDeUsuario => ({
  token: nuevoToken(),
  campos: {
    nombre: textoDe(formData, "nombre"),
    email: textoDe(formData, "email"),
    rol: textoDe(formData, "rol"),
  },
});

const jsonDe = (valor: string): unknown => {
  try {
    return JSON.parse(valor);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

/** La cookie la puede reescribir el navegador: lo que no tenga esta forma se ignora. */
export const decodificarBorrador = (
  valor: string | undefined,
): BorradorDeAltaDeUsuario | null => {
  if (!valor) return null;
  const analisis = esquemaDeBorrador.safeParse(jsonDe(valor));

  return analisis.success ? analisis.data : null;
};
