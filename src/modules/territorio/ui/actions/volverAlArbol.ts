import { redirect } from "next/navigation";

/**
 * El destino de error comun de las acciones de territorio: volver al arbol
 * con la raiz y el nodo seleccionado y el mensaje. El exito NO redirige:
 * la accion revalida y el re-render de la pagina muestra el cambio al
 * instante (el redirect embebido de Next 16.3.1 para la misma ruta con
 * otra query renderiza un 404 mixto -verificado en dev y en build-).
 */
export const volverAlArbol = (
  raiz: string | undefined,
  nodo: string | undefined,
  error: string,
): never => {
  const parametros = new URLSearchParams();
  if (raiz) parametros.set("raiz", raiz);
  if (nodo) parametros.set("nodo", nodo);
  parametros.set("error", error);
  redirect(`/territorio?${parametros.toString()}`);
};

/**
 * La raiz y el nodo abiertos, para poder volver al arbol donde estaba
 * quien envio el formulario.
 *
 * Se leen aparte del `safeParse` y **despues**, no antes: son navegacion,
 * no datos del caso de uso, y la regla de Server Actions de `AGENTS.md`
 * pide que la validacion sea lo primero.
 *
 * No van en el esquema de Zod. Estuvieron, con `.uuid().optional()`, y
 * ningun archivo leia `analisis.data.raiz`: en el camino de exito no se
 * redirige, y en el de error el parseo fallo y no hay `data` que leer.
 * Era validacion que nadie consultaba. Un valor raro no hace danio -el
 * destino siempre es `/territorio`, `URLSearchParams` lo escapa, y la
 * pagina reparsea sus propios parametros-.
 */
export const navegacionDe = (formData: FormData) => ({
  raiz: formData.get("raiz")?.toString() || undefined,
  nodo: formData.get("nodo")?.toString() || undefined,
});
