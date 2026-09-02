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
