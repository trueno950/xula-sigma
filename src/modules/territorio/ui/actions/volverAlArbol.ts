import { redirect } from "next/navigation";

/**
 * El destino de las acciones de territorio: el arbol, con la raiz y el
 * nodo que correspondan y, si la hubo, la falla.
 *
 * Pura y exportada para poder probar el destino sin `redirect`, que es de
 * Next y no nuestro. Sin ningun parametro devuelve `/territorio` pelado:
 * `?` colgando ensucia la barra y no significa nada.
 */
export const rutaDelArbol = ({
  raiz,
  nodo,
  error,
}: {
  raiz?: string | undefined;
  nodo?: string | undefined;
  error?: string | undefined;
}): string => {
  const parametros = new URLSearchParams();
  if (raiz) parametros.set("raiz", raiz);
  if (nodo) parametros.set("nodo", nodo);
  if (error) parametros.set("error", error);

  const consulta = parametros.toString();

  return consulta ? `/territorio?${consulta}` : "/territorio";
};

/**
 * El destino de error comun de las acciones de territorio: volver al arbol
 * con la raiz y el nodo seleccionado y el mensaje.
 *
 * El exito de las demas acciones NO redirige: revalidan y el re-render de
 * la pagina muestra el cambio al instante. La baja es la excepcion, y por
 * que lo es esta en `irAlArbol`.
 */
export const volverAlArbol = (
  raiz: string | undefined,
  nodo: string | undefined,
  error: string,
): never => redirect(rutaDelArbol({ raiz, nodo, error }));

/**
 * El destino de exito de la baja, que es la unica accion que no puede
 * quedarse donde estaba: el nodo que la URL nombra acaba de dejar de
 * existir, y la pagina no lo resuelve mas.
 *
 * Sin esto, `revalidatePath` volvia a renderizar la misma URL con
 * `?nodo=<dado de baja>`, `nodoResuelto` devolvia `null` y la pantalla
 * quedaba en blanco despues de una operacion exitosa.
 *
 * El destino lo arma el servidor a partir de ids, no de una ruta que
 * mande el formulario: la accion nunca redirige a lo que le escriban.
 */
export const irAlArbol = (
  raiz: string | undefined,
  nodo: string | undefined,
): never => redirect(rutaDelArbol({ raiz, nodo }));

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
