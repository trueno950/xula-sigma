import { z } from "zod";

/**
 * Lo que viaja entre la accion que da de baja y la pantalla que lo anuncia
 * una sola vez (S13 y S14 de `usuarios-ux`).
 *
 * **No lleva el nombre ni la fecha.** Con el `usuarioId` alcanza: la
 * pantalla busca a la persona en el listado que ya leyo bajo RLS, y la fecha
 * sale de `bajaEn` de esa misma fila. Un dato personal en una cookie
 * —aunque sea httpOnly— es una copia mas que nadie limpia cuando la persona
 * cambia de nombre; el token existe solo para que el proxy sepa cual
 * peticion consume el aviso.
 *
 * El esquema tiene dientes porque la cookie la puede reescribir el navegador:
 * lo que no tenga esta forma se ignora entero.
 */
const esquemaDeAvisoPendiente = z.object({
  token: z.uuid(),
  usuarioId: z.uuid(),
});

export type AvisoPendiente = z.infer<typeof esquemaDeAvisoPendiente>;

export const codificarAvisoPendiente = (aviso: AvisoPendiente): string =>
  JSON.stringify(aviso);

const jsonDe = (valor: string): unknown => {
  try {
    return JSON.parse(valor);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

export const decodificarAvisoPendiente = (
  valor: string | undefined,
): AvisoPendiente | null => {
  if (!valor) return null;
  const analisis = esquemaDeAvisoPendiente.safeParse(jsonDe(valor));

  return analisis.success ? analisis.data : null;
};
