import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const mocks = vi.hoisted(() => ({
  usoDeCalle: vi.fn(),
  listarZonas: vi.fn(),
}));

vi.mock("@/modules/territorio", () => ({
  usoDeCalle: mocks.usoDeCalle,
  lecturasDeZonas: { listarZonas: mocks.listarZonas },
}));

const { cargarBloqueos } = await import("./cargaDeBloqueos");

const contextoDe = (rol: ContextoActual["usuario"]["rol"]): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});
const cabecera = {
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "cabecera",
  nombre: "Motul",
} as never;
const colonia = {
  id: "22222222-2222-4222-8222-222222222222",
  tipo: "colonia",
  nombre: "Centro",
} as never;
const calleId = "33333333-3333-4333-8333-333333333333" as never;

describe("cargarBloqueos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("lee el uso de la calle abierta para quien puede moverla o darla de baja", async () => {
    mocks.usoDeCalle.mockResolvedValue({
      domicilios: 2,
      zonas: 0,
      zonasActivas: 0,
    });

    const bloqueos = await cargarBloqueos({
      contexto: contextoDe("ADMIN_MUNICIPAL"),
      parametros: { vista: "calles", calleId },
      nodo: cabecera,
    });

    expect(bloqueos.usoDeCalle).toEqual({
      domicilios: 2,
      zonas: 0,
      zonasActivas: 0,
    });
    expect(bloqueos.zonasDelLugar).toBeUndefined();
  });

  it("a un rol sin esas acciones no le lee el uso", async () => {
    const bloqueos = await cargarBloqueos({
      contexto: contextoDe("OPERADOR"),
      parametros: { vista: "calles", calleId },
      nodo: cabecera,
    });

    expect(mocks.usoDeCalle).not.toHaveBeenCalled();
    expect(bloqueos.usoDeCalle).toBeUndefined();
  });

  it("si el uso no se puede leer queda null y la pagina sigue", async () => {
    mocks.usoDeCalle.mockRejectedValue(new Error("caida"));

    const bloqueos = await cargarBloqueos({
      contexto: contextoDe("ADMIN_MUNICIPAL"),
      parametros: { vista: "calles", calleId },
      nodo: cabecera,
    });

    expect(bloqueos.usoDeCalle).toBeNull();
  });

  it("cuenta las zonas solo en Editar de un asentamiento", async () => {
    mocks.listarZonas.mockResolvedValue([{}, {}]);
    const enEditar = await cargarBloqueos({
      contexto: contextoDe("OPERADOR"),
      parametros: { vista: "editar", calleId: undefined },
      nodo: cabecera,
    });
    const enColonia = await cargarBloqueos({
      contexto: contextoDe("OPERADOR"),
      parametros: { vista: "editar", calleId: undefined },
      nodo: colonia,
    });

    expect(enEditar.zonasDelLugar).toBe(2);
    expect(enColonia.zonasDelLugar).toBeUndefined();
    expect(mocks.listarZonas).toHaveBeenCalledTimes(1);
  });
});
