import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "./ayuntamientoId";

const crearCliente = vi.hoisted(() => vi.fn());

vi.mock("postgres", () => ({ default: crearCliente }));

const { cerrarHubDeNotificaciones, suscribirActualizaciones } = await import(
  "./notificacionesDeTenant"
);

const tenant = "11111111-1111-4111-8111-111111111111" as AyuntamientoId;
const SECRETO = "payload-con-datos-de-un-vecino";

type Escucha = {
  alNotificar: (payload: string) => void;
  alEscuchar: () => void;
};

function abrirListenFalso(): Escucha {
  let escucha: Escucha | undefined;
  const listen = async (
    _canal: string,
    alNotificar: Escucha["alNotificar"],
    alEscuchar: Escucha["alEscuchar"],
  ) => {
    escucha = { alNotificar, alEscuchar };
    alEscuchar();
    return { unlisten: vi.fn().mockResolvedValue(undefined) };
  };
  crearCliente.mockReturnValue({
    listen,
    end: vi.fn().mockResolvedValue(undefined),
  });
  return {
    alNotificar: (payload) => escucha?.alNotificar(payload),
    alEscuchar: () => escucha?.alEscuchar(),
  };
}

const fallar = () => {
  throw new Error(SECRETO);
};

let registro: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  await cerrarHubDeNotificaciones();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const esperarFalloSinDatos = () => {
  expect(registro).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(registro.mock.calls)).not.toContain(SECRETO);
};

describe("hub de notificaciones: un suscriptor que falla", () => {
  it("no impide entregar el payload a los demas y deja el fallo registrado", async () => {
    const escucha = abrirListenFalso();
    const recibidos: string[] = [];
    await suscribirActualizaciones(tenant, fallar);
    await suscribirActualizaciones(tenant, (payload) =>
      recibidos.push(payload),
    );

    expect(() => escucha.alNotificar('{"tipo":"calle"}')).not.toThrow();

    expect(recibidos).toEqual(['{"tipo":"calle"}']);
    esperarFalloSinDatos();
  });

  it("no impide avisar la reconexion a los demas y deja el fallo registrado", async () => {
    const escucha = abrirListenFalso();
    const reconexiones = vi.fn();
    await suscribirActualizaciones(tenant, vi.fn(), fallar);
    await suscribirActualizaciones(tenant, vi.fn(), reconexiones);

    expect(() => escucha.alEscuchar()).not.toThrow();

    expect(reconexiones).toHaveBeenCalledTimes(1);
    esperarFalloSinDatos();
  });

  it("registra un fallo por suscriptor y solo despues de entregar a todos", async () => {
    const escucha = abrirListenFalso();
    const alRegistrar: number[] = [];
    let entregas = 0;
    registro.mockImplementation(() => alRegistrar.push(entregas));
    await suscribirActualizaciones(tenant, fallar);
    await suscribirActualizaciones(tenant, () => {
      entregas += 1;
    });
    await suscribirActualizaciones(tenant, fallar);
    await suscribirActualizaciones(tenant, () => {
      entregas += 1;
    });

    escucha.alNotificar("{}");

    expect(alRegistrar).toEqual([2, 2]);
  });
});
