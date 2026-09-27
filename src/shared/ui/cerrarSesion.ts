type Enviar = (
  url: string,
  opciones: RequestInit,
) => Promise<Pick<Response, "ok">>;

const TIEMPO_MAXIMO_CIERRE_MS = 15_000;

/**
 * Pide el cierre a la ruta de Better Auth, la misma puerta del acceso: borra
 * la fila de la sesion y responde con la cookie vencida. Ninguna otra puerta
 * cierra sesion, asi que no hay una segunda que acordarse de proteger.
 *
 * Los fallos de red y las cancelaciones son recuperables; los demas defectos
 * se propagan para que los registre el limite del evento.
 */
export async function cerrarSesion(
  enviar: Enviar,
): Promise<"cerrada" | "fallida"> {
  const controlador = new AbortController();
  const temporizador = setTimeout(
    () => controlador.abort(),
    TIEMPO_MAXIMO_CIERRE_MS,
  );

  try {
    const respuesta = await enviar("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: controlador.signal,
    });

    return respuesta.ok ? "cerrada" : "fallida";
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return "fallida";
    }

    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

type EstadoDeCierre = { enCurso: boolean; fallo: boolean };

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
  } finally {
    if (!cerrada) marcar({ enCurso: false, fallo: true });
  }

  if (cerrada) irA("/acceso");
}
