/**
 * Agrega `regreso` a una ruta del arbol -la del panel, la de la migaja o la
 * de un hermano de direccion- sin repetir el nombre del parametro ni su
 * codificacion en cada enlace. `regreso` llega ya validado por
 * `esquemaDeRegreso` (`regresoAFicha.ts`): aca solo se transporta.
 *
 * Vive en su propio archivo, y no en `contenido.ts`, porque la migaja
 * (`vistaDePanel.ts`) tambien lo usa y `contenido.ts` esta en el limite de
 * las 200 lineas de `AGENTS.md`.
 */
export const conRegreso = (
  ruta: string,
  regreso: string | undefined,
): string =>
  regreso
    ? `${ruta}${ruta.includes("?") ? "&" : "?"}regreso=${encodeURIComponent(regreso)}`
    : ruta;
