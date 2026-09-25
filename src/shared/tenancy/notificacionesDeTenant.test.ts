import { afterEach, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "./ayuntamientoId";

const crearCliente = vi.hoisted(() => vi.fn());

vi.mock("postgres", () => ({ default: crearCliente }));

const { cerrarHubDeNotificaciones, suscribirActualizaciones } = await import(
  "./notificacionesDeTenant"
);

const tenant = "11111111-1111-4111-8111-111111111111" as AyuntamientoId;

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
});
