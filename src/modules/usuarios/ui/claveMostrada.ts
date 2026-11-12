import { z } from "zod";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";

/**
 * La clave temporal que la accion guarda para que la pantalla la muestre una
 * sola vez (S4). Viaja en una cookie httpOnly y su token opaco va en la URL
 * —ver `claveTemporalEnCookie.ts`—; aca solo se decide su forma.
 *
 * El esquema tiene dientes porque la cookie la puede reescribir el navegador:
 * lo que no tenga esta forma se ignora entero en vez de mostrarse a medias.
 * La clave se valida contra `LARGO_MINIMO` por la misma razon: un valor
 * corto no es una clave que el sistema haya generado.
 */

const MOTIVOS = ["alta", "restablecimiento"] as const;

export type MotivoDeClaveMostrada = (typeof MOTIVOS)[number];

const esquemaDeClaveMostrada = z.object({
  token: z.uuid(),
  motivo: z.enum(MOTIVOS),
  usuarioId: z.uuid(),
  clave: z.string().min(LARGO_MINIMO).max(64),
});

export type ClaveMostrada = z.infer<typeof esquemaDeClaveMostrada>;

export const codificarClaveMostrada = (mostrada: ClaveMostrada): string =>
  JSON.stringify(mostrada);

const jsonDe = (valor: string): unknown => {
  try {
    return JSON.parse(valor);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

export const decodificarClaveMostrada = (
  valor: string | undefined,
): ClaveMostrada | null => {
  if (!valor) return null;
  const analisis = esquemaDeClaveMostrada.safeParse(jsonDe(valor));

  return analisis.success ? analisis.data : null;
};
