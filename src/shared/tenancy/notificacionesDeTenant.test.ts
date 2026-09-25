import { afterEach, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "./ayuntamientoId";

const crearCliente = vi.hoisted(() => vi.fn());

vi.mock("postgres", () => ({ default: crearCliente }));

const { cerrarHubDeNotificaciones, suscribirActualizaciones } = await import(
  "./notificacionesDeTenant"
);

const tenant = "11111111-1111-4111-8111-111111111111" as AyuntamientoId;
const otroTenant = "22222222-2222-4222-8222-222222222222" as AyuntamientoId;

type Escucha = {
  alNotificar: (payload: string) => void;
  alEscuchar: () => void;
};

function crearListenFalso() {
  const escuchas = new Map<string, Escucha>();
  const unlisten = vi.fn().mockResolvedValue(undefined);
  const listen = vi.fn(
    async (
      canal: string,
      alNotificar: Escucha["alNotificar"],
      alEscuchar: Escucha["alEscuchar"],
    ) => {
      escuchas.set(canal, { alNotificar, alEscuchar });
      alEscuchar();
      return { unlisten };
    },
  );
  crearCliente.mockReturnValue({
    listen,
    end: vi.fn().mockResolvedValue(undefined),
  });
  return { escuchas, listen };
}

afterEach(async () => {
  await cerrarHubDeNotificaciones();
  vi.clearAllMocks();
});

describe("hub de notificaciones", () => {
  it("espera una unica apertura concurrente y desmonta sus canales", async () => {
    let resolver:
      | ((valor: { unlisten: () => Promise<void> }) => void)
      | undefined;
    const unlisten = vi.fn().mockResolvedValue(undefined);
    const listen = vi.fn(
      () =>
        new Promise<{ unlisten: () => Promise<void> }>((resolve) => {
          resolver = resolve;
        }),
    );
    const end = vi.fn().mockResolvedValue(undefined);
    crearCliente.mockReturnValue({ listen, end });

    const primera = suscribirActualizaciones(tenant, vi.fn());
    const segunda = suscribirActualizaciones(tenant, vi.fn());
    let segundaLista = false;
    void segunda.then(() => {
      segundaLista = true;
    });

    await Promise.resolve();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(segundaLista).toBe(false);
    expect(resolver).toBeTypeOf("function");
    resolver?.({ unlisten });
    await Promise.all([primera, segunda]);
    await cerrarHubDeNotificaciones();

    expect(unlisten).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("reabre el canal si una nueva suscripcion llega mientras se desescucha", async () => {
    let terminarUnlisten: (() => void) | undefined;
    const unlisten = vi.fn(
      () => new Promise<void>((resolve) => (terminarUnlisten = resolve)),
    );
    const listen = vi
      .fn()
      .mockResolvedValueOnce({ unlisten })
      .mockResolvedValueOnce({
        unlisten: vi.fn().mockResolvedValue(undefined),
      });
    crearCliente.mockReturnValue({
      listen,
      end: vi.fn().mockResolvedValue(undefined),
    });

    const primera = await suscribirActualizaciones(tenant, vi.fn());
    const cierre = primera.cerrar();
    const segunda = suscribirActualizaciones(tenant, vi.fn());

    expect(terminarUnlisten).toBeTypeOf("function");
    terminarUnlisten?.();
    await cierre;
    await segunda;

    expect(listen).toHaveBeenCalledTimes(2);
  });

  it("avisa a cada suscriptor del canal en un re-listen y no en el primer listen", async () => {
    const { escuchas } = crearListenFalso();
    const reconectoA = vi.fn();
    const reconectoB = vi.fn();
    await suscribirActualizaciones(tenant, vi.fn(), reconectoA);
    await suscribirActualizaciones(tenant, vi.fn(), reconectoB);

    expect(reconectoA).not.toHaveBeenCalled();
    expect(reconectoB).not.toHaveBeenCalled();

    escuchas.get(`xula_sse_${tenant}`)?.alEscuchar();
    expect(reconectoA).toHaveBeenCalledTimes(1);
    expect(reconectoB).toHaveBeenCalledTimes(1);

    escuchas.get(`xula_sse_${tenant}`)?.alEscuchar();
    expect(reconectoA).toHaveBeenCalledTimes(2);
  });

  it("no avisa la reconexion a otro tenant ni a un suscriptor ya cerrado", async () => {
    const { escuchas } = crearListenFalso();
    const reconectoOtro = vi.fn();
    const reconectoCerrado = vi.fn();
    const vigente = vi.fn();
    await suscribirActualizaciones(otroTenant, vi.fn(), reconectoOtro);
    const cerrada = await suscribirActualizaciones(
      tenant,
      vi.fn(),
      reconectoCerrado,
    );
    await suscribirActualizaciones(tenant, vi.fn(), vigente);
    await cerrada.cerrar();

    escuchas.get(`xula_sse_${tenant}`)?.alEscuchar();

    expect(vigente).toHaveBeenCalledTimes(1);
    expect(reconectoCerrado).not.toHaveBeenCalled();
    expect(reconectoOtro).not.toHaveBeenCalled();
  });

  it("sigue reenviando payloads a quien no pidio aviso de reconexion", async () => {
    const { escuchas } = crearListenFalso();
    const recibidos: string[] = [];
    await suscribirActualizaciones(tenant, (payload) =>
      recibidos.push(payload),
    );

    escuchas.get(`xula_sse_${tenant}`)?.alEscuchar();
    escuchas.get(`xula_sse_${tenant}`)?.alNotificar('{"tipo":"calle"}');

    expect(recibidos).toEqual(['{"tipo":"calle"}']);
  });

  it("ignora un listen anterior que la libreria dejo registrado tras cerrar el canal", async () => {
    const { escuchas, listen } = crearListenFalso();
    const canal = `xula_sse_${tenant}`;
    const primera = await suscribirActualizaciones(tenant, vi.fn(), vi.fn());
    const listenViejo = escuchas.get(canal);
    await primera.cerrar();

    const recibidos: string[] = [];
    const reconexiones = vi.fn();
    await suscribirActualizaciones(
      tenant,
      (payload) => recibidos.push(payload),
      reconexiones,
    );
    listenViejo?.alNotificar('{"tipo":"viejo"}');
    listenViejo?.alEscuchar();

    expect(listen).toHaveBeenCalledTimes(2);
    expect(recibidos).toEqual([]);
    expect(reconexiones).not.toHaveBeenCalled();
  });
});
