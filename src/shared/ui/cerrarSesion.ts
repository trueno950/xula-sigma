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

type EstadoDeCierre = { enCurso: boolean; fallo: boolean };

/**
 * Lo que hace el clic, sin React: el boton solo conecta estado y navegacion.
 *
 * Cualquier error, de red o no, termina en el aviso y con el boton libre: un
 * `AbortError` o un defecto dentro de `fetch` dejaba el boton bloqueado hasta
 * recargar y la promesa del clic sin atender. Se registra solo el nombre del
 * error, no el objeto: es un log sin RLS ni bitacora de acceso.
 *
 * En exito el boton **sigue bloqueado**: la pagina se esta yendo y un segundo
 * clic pediria un cierre de una sesion que ya no existe.
 */
export async function cerrarYVolver(dependencias: {
  enviar: Enviar;
  irA: (ruta: string) => void;
  marcar: (estado: EstadoDeCierre) => void;
}): Promise<void> {
  const { enviar, irA, marcar } = dependencias;
  let cerrada = false;

  marcar({ enCurso: true, fallo: false });

  try {
    cerrada = (await cerrarSesion(enviar)) === "cerrada";
  } catch (error) {
    console.error(
      "[cerrarSesion] fallo inesperado",
      error instanceof Error ? error.name : "desconocido",
    );
  } finally {
    if (!cerrada) marcar({ enCurso: false, fallo: true });
  }

  if (cerrada) irA("/acceso");
}
