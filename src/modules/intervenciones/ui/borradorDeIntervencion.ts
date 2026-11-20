import { z } from "zod";
import { nuevoToken } from "@/shared/ui/borradorEnCookie";

/**
 * Lo que el operador capturó en el alta de una intervención cuando el
 * servidor la rechazó (S8 de `odd/tasks/intervenciones-ux.md`), para que la
 * página vuelva a llenar el formulario. Viaja en una cookie
 * (`borradorEnCookie.ts`); acá solo se decide su forma.
 *
 * Los techos no son reglas del alta: son el techo de la cookie. Un id mide
 * 36 y la fecha civil 10; la descripción se guarda entera porque el
 * formulario ya la acota a 1000, que es lo que cabe en la cookie junto con
 * los otros cuatro campos.
 */
const LARGO_DE_ID = 36;
const LARGO_DE_TIPO = 40;
const LARGO_DE_FECHA = 10;
const LARGO_DE_DESCRIPCION = 1000;

const esquemaDeCampos = z.object({
  tipo: z.string().max(LARGO_DE_TIPO),
  lugarId: z.string().max(LARGO_DE_ID),
  calleId: z.string().max(LARGO_DE_ID),
  fechaDeOcurrencia: z.string().max(LARGO_DE_FECHA),
  descripcion: z.string().max(LARGO_DE_DESCRIPCION),
});

const esquemaDeBorrador = z.object({
  token: z.uuid(),
  campos: esquemaDeCampos,
});

export type CamposDeBorradorDeIntervencion = z.infer<typeof esquemaDeCampos>;
export type BorradorDeIntervencion = z.infer<typeof esquemaDeBorrador>;

const LARGOS: Record<keyof CamposDeBorradorDeIntervencion, number> = {
  tipo: LARGO_DE_TIPO,
  lugarId: LARGO_DE_ID,
  calleId: LARGO_DE_ID,
  fechaDeOcurrencia: LARGO_DE_FECHA,
  descripcion: LARGO_DE_DESCRIPCION,
};

const textoDe = (
  formData: FormData,
  campo: keyof CamposDeBorradorDeIntervencion,
): string => {
  const valor = formData.get(campo);

  return typeof valor === "string" ? valor.slice(0, LARGOS[campo]) : "";
};

/**
 * Lo capturado en el POST, tal cual: la acción lo guarda antes de validar,
 * así que un formulario inválido también vuelve con sus valores.
 */
export const borradorDelFormulario = (
  formData: FormData,
): BorradorDeIntervencion => ({
  token: nuevoToken(),
  campos: {
    tipo: textoDe(formData, "tipo"),
    lugarId: textoDe(formData, "lugarId"),
    calleId: textoDe(formData, "calleId"),
    fechaDeOcurrencia: textoDe(formData, "fechaDeOcurrencia"),
    descripcion: textoDe(formData, "descripcion"),
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
): BorradorDeIntervencion | null => {
  if (!valor) return null;
  const analisis = esquemaDeBorrador.safeParse(jsonDe(valor));

  return analisis.success ? analisis.data : null;
};
