import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const contextoActualMock = vi.hoisted(() => vi.fn());
const suscribirMock = vi.hoisted(() => vi.fn());
const cerrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/shared/tenancy/notificacionesDeTenant", () => ({
  suscribirActualizaciones: suscribirMock,
}));

const { GET } = await import("./route");

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

describe("GET /eventos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    suscribirMock.mockResolvedValue({ cerrar: cerrarMock });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza sin sesion sin abrir una escucha", async () => {
    contextoActualMock.mockResolvedValue(null);

    const respuesta = await GET();

    expect(respuesta.status).toBe(401);
    expect(suscribirMock).not.toHaveBeenCalled();
  });

  it("suscribe solo al tenant del contexto y emite resync y heartbeat", async () => {
    vi.useFakeTimers();
    const respuesta = await GET();
    const lector = respuesta.body?.getReader();
    const primerChunk = await lector?.read();
    await vi.advanceTimersByTimeAsync(15_000);
    const latido = await lector?.read();

    expect(suscribirMock).toHaveBeenCalledWith(
      contexto.ayuntamientoId,
      expect.any(Function),
      expect.any(Function),
    );
    expect(respuesta.headers.get("Content-Type")).toBe("text/event-stream");
    expect(respuesta.headers.get("X-Accel-Buffering")).toBe("no");
    expect(new TextDecoder().decode(primerChunk?.value)).toContain("resync");
    expect(new TextDecoder().decode(latido?.value)).toContain("heartbeat");

    await lector?.cancel();
    expect(cerrarMock).toHaveBeenCalledTimes(1);
  });

  it("reenvia el payload acotado del hub como evento SSE", async () => {
    let publicar: ((payload: string) => void) | undefined;
    suscribirMock.mockImplementation(async (_tenant, consumidor) => {
      publicar = consumidor as (payload: string) => void;
      return { cerrar: vi.fn() };
    });

    const respuesta = await GET();
    const lector = respuesta.body?.getReader();
    await lector?.read();
    publicar?.('{"tipo":"calle"}');
    const evento = await lector?.read();

    expect(new TextDecoder().decode(evento?.value)).toContain("actualizacion");
    expect(new TextDecoder().decode(evento?.value)).toContain(
      '{"tipo":"calle"}',
    );
    await lector?.cancel();
  });

  it("reenvia la reconexion del hub como un nuevo evento resync", async () => {
    let reconectar: (() => void) | undefined;
    suscribirMock.mockImplementation(
      async (_tenant, _consumidor, alReconectar) => {
        reconectar = alReconectar as () => void;
        return { cerrar: vi.fn() };
      },
    );

    const respuesta = await GET();
    const lector = respuesta.body?.getReader();
    await lector?.read();
    reconectar?.();
    const evento = await lector?.read();

    expect(new TextDecoder().decode(evento?.value)).toBe(
      "event: resync\ndata: \n\n",
    );
    await lector?.cancel();
  });

  it("no encola nada si el hub avisa despues de cancelar el stream", async () => {
    let consumir: ((payload: string) => void) | undefined;
    let reconectar: (() => void) | undefined;
    suscribirMock.mockImplementation(
      async (_tenant, consumidor, alReconectar) => {
        consumir = consumidor as (payload: string) => void;
        reconectar = alReconectar as () => void;
        return { cerrar: vi.fn() };
      },
    );
    const respuesta = await GET();
    const lector = respuesta.body?.getReader();
    await lector?.read();
    await lector?.cancel();

    expect(() => consumir?.('{"tipo":"calle"}')).not.toThrow();
    expect(() => reconectar?.()).not.toThrow();
  });

  it("cierra una suscripcion que resuelve despues de cancelar el stream", async () => {
    let resolver:
      | ((suscripcion: { cerrar: () => Promise<void> }) => void)
      | undefined;
    suscribirMock.mockImplementation(
      () =>
        new Promise<{ cerrar: () => Promise<void> }>((resolve) => {
          resolver = resolve;
        }),
    );
    const respuesta = await GET();
    const lector = respuesta.body?.getReader();
    const lectura = lector?.read();
    await Promise.resolve();
    const cancelar = lector?.cancel();

    resolver?.({ cerrar: cerrarMock });
    await cancelar;
    await lectura;

    expect(cerrarMock).toHaveBeenCalledTimes(1);
  });
});
