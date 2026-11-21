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

const MOTIVOS = ["alta", "restablecimiento", "reactivacion"] as const;

export type MotivoDeClaveMostrada = (typeof MOTIVOS)[number];

const esquemaDeClaveMostrada = z.object({
  token: z.uuid(),
  motivo: z.enum(MOTIVOS),
  usuarioId: z.uuid(),
  clave: z.string().min(LARGO_MINIMO).max(64),
});

export type ClaveMostrada = z.infer<typeof esquemaDeClaveMostrada>;

/**
 * Lo que el servidor le entrega a la isla que pinta la tarjeta (S4 de
 * `usuarios-seguridad`): el motivo, para titularla, y la clave. Ni el token ni
 * el `usuarioId`, que la pantalla ya tiene.
 *
 * Es el mismo esquema que el de la cookie, recortado, y se valida en los dos
 * extremos —el Route Handler lo arma y la isla lo lee— por la misma razon por
 * la que la cookie se valida entera: lo que llega del otro lado puede no
 * tener esta forma, y una clave a medias es peor que ninguna.
 */
export type ClaveEntregada = Pick<ClaveMostrada, "motivo" | "clave">;

const esquemaDeClaveEntregada = esquemaDeClaveMostrada.pick({
  motivo: true,
  clave: true,
});

export const claveEntregadaDe = ({
  motivo,
  clave,
}: ClaveMostrada): ClaveEntregada => ({ motivo, clave });

export const decodificarClaveEntregada = (
  valor: unknown,
): ClaveEntregada | null => {
  const analisis = esquemaDeClaveEntregada.safeParse(valor);

  return analisis.success ? analisis.data : null;
};

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
