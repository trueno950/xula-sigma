import { contextoActual } from "@/shared/auth";
import { suscribirActualizaciones } from "@/shared/tenancy/notificacionesDeTenant";

export const runtime = "nodejs";

const LATIDO_MS = 15_000;
const codificador = new TextEncoder();

const evento = (nombre: string, datos = "") =>
  codificador.encode(`event: ${nombre}\ndata: ${datos}\n\n`);

function cuerpoDeEventos(
  ayuntamientoId: Parameters<typeof suscribirActualizaciones>[0],
): ReadableStream<Uint8Array> {
  let intervalo: ReturnType<typeof setInterval> | undefined;
  let suscripcion: Awaited<ReturnType<typeof suscribirActualizaciones>> | null =
    null;
  let activo = true;

  return new ReadableStream<Uint8Array>({
    async start(controlador) {
      controlador.enqueue(evento("resync"));
      suscripcion = await suscribirActualizaciones(
        ayuntamientoId,
        (payload) => {
          if (activo) controlador.enqueue(evento("actualizacion", payload));
        },
        () => {
          if (activo) controlador.enqueue(evento("resync"));
        },
      );
      if (!activo) {
        await suscripcion.cerrar();
        return;
      }
      intervalo = setInterval(
        () => controlador.enqueue(evento("heartbeat")),
        LATIDO_MS,
      );
    },
    async cancel() {
      activo = false;
      if (intervalo) clearInterval(intervalo);
      await suscripcion?.cerrar();
    },
  });
}

function respuestaDeEventos(
  ayuntamientoId: Parameters<typeof suscribirActualizaciones>[0],
): Response {
  return new Response(cuerpoDeEventos(ayuntamientoId), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET(): Promise<Response> {
  const contexto = await contextoActual();
  if (!contexto) return new Response(null, { status: 401 });

  return respuestaDeEventos(contexto.ayuntamientoId);
}
