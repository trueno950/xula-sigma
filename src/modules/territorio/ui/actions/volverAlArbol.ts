import { redirect } from "next/navigation";
import { z } from "zod";

/**
 * El destino de las acciones de territorio: el arbol, con el contexto visible
 * que correspondan y, si la hubo, la falla.
 *
 * Pura y exportada para poder probar el destino sin `redirect`, que es de
 * Next y no nuestro. Sin ningun parametro devuelve `/territorio` pelado:
 * `?` colgando ensucia la barra y no significa nada.
 */
export const rutaDelArbol = ({
  raiz,
  nodo,
  vista,
  accion,
  calle,
  error,
}: {
  raiz?: string | undefined;
  nodo?: string | undefined;
  vista?: string | undefined;
  accion?: string | undefined;
  calle?: string | undefined;
  error?: string | undefined;
}): string => {
  const parametros = new URLSearchParams();
  if (raiz) parametros.set("raiz", raiz);
  if (nodo) parametros.set("nodo", nodo);
  if (vista) parametros.set("vista", vista);
  if (accion) parametros.set("accion", accion);
  if (calle) parametros.set("calle", calle);
  if (error) parametros.set("error", error);

  const consulta = parametros.toString();

  return consulta ? `/territorio?${consulta}` : "/territorio";
};

/**
 * El destino de error comun de las acciones de territorio: volver al arbol
 * con el contexto seleccionado y el mensaje.
 *
 * El exito de la mayoria de las acciones NO redirige: revalidan y el
 * re-render de la pagina muestra el cambio al instante. La baja y el
 * reparenteo son la excepcion -mueven o borran el nodo que la URL nombra,
 * asi que quedarse ahi ya no resuelve nada- y por que lo son esta en
 * `irAlArbol`.
 */
export const volverAlArbol = (
  navegacion: ReturnType<typeof navegacionDe>,
  error: string,
): never => redirect(rutaDelArbol({ ...navegacion, error }));

/**
 * El destino de exito de la baja y el reparenteo, las dos acciones que no
 * pueden quedarse donde estaban: el nodo que la URL nombra o dejo de
 * existir -baja- o ya no cuelga de esa raiz -reparenteo-, y la pagina no
 * lo resuelve mas.
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
 * El contexto abierto del arbol, para poder volver donde estaba quien envio
 * el formulario. Se lee aca y en ningun otro lado: es el unico sitio donde
 * vive esta decision.
 *
 * Se leen aparte del `safeParse` y **despues**, no antes: son navegacion,
 * no datos del caso de uso, y la regla de Server Actions de `AGENTS.md`
 * pide que la validacion sea lo primero.
 *
 * Se validan aca, con su propio esquema, y no en el del caso de uso: son
 * navegacion, no datos, y el orden que pide la regla de Server Actions es
 * que la validacion del caso de uso vaya primero. No incluye identidad de
 * tenant: esa siempre sale del contexto del servidor.
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
  vista: z
    .enum(["lugares", "calles", "domicilios", "editar"])
    .optional()
    .catch(undefined),
  accion: z
    .enum([
      "lugar",
      "calle",
      "ubicarCalle",
      "reparentearCalle",
      "bajaCalle",
      "renombrarCalle",
      "domicilio",
      "renombrar",
      "baja",
      "reparentear",
    ])
    .optional()
    .catch(undefined),
  calle: z.string().uuid().optional().catch(undefined),
});

export const navegacionDe = (formData: FormData) =>
  esquemaDeNavegacion.parse({
    raiz: formData.get("raiz")?.toString() || undefined,
    nodo: formData.get("nodo")?.toString() || undefined,
    padre: formData.get("padre")?.toString() || undefined,
    vista: formData.get("vista")?.toString() || undefined,
    accion: formData.get("accion")?.toString() || undefined,
    calle: formData.get("calle")?.toString() || undefined,
  });
