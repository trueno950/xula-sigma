type Enviar = (
  url: string,
  opciones: RequestInit,
) => Promise<Pick<Response, "ok">>;

/**
 * Pide el cierre a la ruta de Better Auth, la misma puerta del acceso: borra
 * la fila de la sesion y responde con la cookie vencida. Ninguna otra puerta
 * cierra sesion, asi que no hay una segunda que acordarse de proteger.
 *
 * Solo el `TypeError` de `fetch` —sin red— cuenta como cierre fallido; un
 * error de otra clase es un defecto y sale.
 */
export async function cerrarSesion(
  enviar: Enviar,
): Promise<"cerrada" | "fallida"> {
  try {
    const respuesta = await enviar("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    return respuesta.ok ? "cerrada" : "fallida";
  } catch (error) {
    if (error instanceof TypeError) return "fallida";

    throw error;
  }
}
