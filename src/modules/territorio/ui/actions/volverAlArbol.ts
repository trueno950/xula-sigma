import { redirect } from "next/navigation";
import { z } from "zod";

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
 * La raiz, el nodo y el padre abiertos, para poder volver al arbol donde
 * estaba quien envio el formulario. Los tres se leen aca y en ningun otro
 * lado: es el unico sitio donde vive esta decision.
 *
 * Se leen aparte del `safeParse` y **despues**, no antes: son navegacion,
 * no datos del caso de uso, y la regla de Server Actions de `AGENTS.md`
 * pide que la validacion sea lo primero.
 *
 * Se validan aca, con su propio esquema, y no en el del caso de uso: son
 * navegacion, no datos, y el orden que pide la regla de Server Actions es
 * que la validacion del caso de uso vaya primero.
 *
 * Estuvieron sin validar mientras ningun camino de exito redirigia: el
 * destino siempre era `/territorio`, `URLSearchParams` escapaba el valor y
 * la pagina reparseaba sus propios parametros. Dejo de alcanzar cuando la
 * baja y el reparenteo empezaron a redirigir con estos campos: un `padre`
 * falseado elige a donde cae el operador despues de una operacion que
 * salio bien. Lo que no sea un UUID se descarta y el destino cae al
 * listado, que siempre existe.
 */
const esquemaDeNavegacion = z.object({
  raiz: z.string().uuid().optional().catch(undefined),
  nodo: z.string().uuid().optional().catch(undefined),
  padre: z.string().uuid().optional().catch(undefined),
});

export const navegacionDe = (formData: FormData) =>
  esquemaDeNavegacion.parse({
    raiz: formData.get("raiz")?.toString() || undefined,
    nodo: formData.get("nodo")?.toString() || undefined,
    padre: formData.get("padre")?.toString() || undefined,
  });
