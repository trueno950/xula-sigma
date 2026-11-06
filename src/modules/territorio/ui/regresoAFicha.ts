import { z } from "zod";

const PREFIJO_DE_FICHA = "/padron/";

/**
 * El unico regreso que acepta el alta de domicilio: la ficha de una
 * persona, `/padron/<uuid>` y nada mas. Llega del formulario, que es
 * entrada del cliente, y termina en un `redirect`: cualquier otra forma
 * -una URL absoluta, `//host`, un `..`, otra pantalla- seria una redireccion
 * abierta. Se compara el tramo entero contra un uuid, no un prefijo.
 */
export const esquemaDeRegreso = z
  .string()
  .refine(
    (destino) =>
      destino.startsWith(PREFIJO_DE_FICHA) &&
      z.uuid().safeParse(destino.slice(PREFIJO_DE_FICHA.length)).success,
  );

export const fichaDePersona = (personaId: string): string =>
  `${PREFIJO_DE_FICHA}${personaId}`;

/** El alta de domicilio de territorio, con la ficha de la persona como regreso. */
export const enlaceDeAltaDesdeFicha = (personaId: string): string =>
  `/territorio?${new URLSearchParams({
    accion: "domicilio",
    regreso: fichaDePersona(personaId),
  }).toString()}`;
