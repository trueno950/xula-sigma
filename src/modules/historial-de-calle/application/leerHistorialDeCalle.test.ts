import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId } from "../domain";
import type {
  CalleParaHistorial,
  FuentesDeHistorial,
  IntervencionParaHistorial,
  ReporteParaHistorial,
} from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearLeerHistorialDeCalle } = await import("./leerHistorialDeCalle");

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");
const instante = new Date("2026-03-10T00:00:00.000Z");

const sinCambio = {
  nombre: { anterior: null, nuevo: null },
  punto: { anterior: null, nuevo: null },
  lugar: { anterior: null, nuevo: null },
};
const calle: CalleParaHistorial = [
  {
    id: "evento-z",
    naturaleza: "RENOMBRE",
    ocurridoEn: instante,
    cambio: {
      ...sinCambio,
      nombre: { anterior: "Calle 20", nuevo: "Calle 20-A" },
    },
  },
  {
    id: "evento-a",
    naturaleza: "RENOMBRE",
    ocurridoEn: instante,
    cambio: null,
  },
  {
    id: "evento-u",
    naturaleza: "UBICACION",
    ocurridoEn: instante,
    cambio: null,
  },
];
const reporte: ReporteParaHistorial = {
  id: "reporte-1",
  registradoEn: instante,
};
const intervencion: IntervencionParaHistorial = {
  id: "intervencion-1",
  fechaDeOcurrencia: "2026-03-10",
};

describe("leerHistorialDeCalle", () => {
  const fuentes: FuentesDeHistorial = {
    callePorId: vi.fn(),
    reportesPorCalle: vi.fn(),
    intervencionesPorCalle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(fuentes.callePorId).mockResolvedValue(calle);
    vi.mocked(fuentes.reportesPorCalle).mockResolvedValue([reporte]);
    vi.mocked(fuentes.intervencionesPorCalle).mockResolvedValue([intervencion]);
  });

  it("compone las tres fuentes y ordena empates por naturaleza e id", async () => {
    const leer = crearLeerHistorialDeCalle(fuentes);

    const primera = await leer(calleId, contexto);
    const segunda = await leer(calleId, contexto);

    expect(primera).toMatchObject({ estado: "CON_DATOS", calleId });
    expect(primera?.entradas.map((entrada) => entrada.naturaleza)).toEqual([
      "REPORTE",
      "INTERVENCION",
      "RENOMBRE",
      "RENOMBRE",
      "UBICACION",
    ]);
    expect(primera?.entradas.map((entrada) => entrada.id)).toEqual([
      "reporte-1",
      "intervencion-1",
      "evento-a",
      "evento-z",
      "evento-u",
    ]);
    expect(segunda?.entradas.map((entrada) => entrada.id)).toEqual(
      primera?.entradas.map((entrada) => entrada.id),
    );
    expect(fuentes.reportesPorCalle).toHaveBeenCalledWith({}, calleId);
    expect(fuentes.intervencionesPorCalle).toHaveBeenCalledWith({}, calleId);
    expect(withTenantMock).toHaveBeenLastCalledWith(
      contexto.ayuntamientoId,
      expect.any(Function),
    );
  });

  it("conserva el payload del evento y deja nulo el de un evento viejo", async () => {
    const historial = await crearLeerHistorialDeCalle(fuentes)(
      calleId,
      contexto,
    );

    const porId = (id: string) =>
      historial?.entradas.find((entrada) => entrada.id === id)?.cambio;

    expect(porId("evento-z")).toEqual({
      ...sinCambio,
      nombre: { anterior: "Calle 20", nuevo: "Calle 20-A" },
    });
    expect(porId("evento-a")).toBeNull();
    expect(porId("reporte-1")).toBeNull();
  });

  it("devuelve el estado vacio cuando la calle no tiene hechos", async () => {
    vi.mocked(fuentes.callePorId).mockResolvedValue([]);
    vi.mocked(fuentes.reportesPorCalle).mockResolvedValue([]);
    vi.mocked(fuentes.intervencionesPorCalle).mockResolvedValue([]);

    await expect(
      crearLeerHistorialDeCalle(fuentes)(calleId, contexto),
    ).resolves.toEqual({ calleId, estado: "VACIO", entradas: [] });
  });

  it("trata una calle invisible como no encontrada y no consulta sus fuentes", async () => {
    vi.mocked(fuentes.callePorId).mockResolvedValue(null);

    await expect(
      crearLeerHistorialDeCalle(fuentes)(calleId, contexto),
    ).resolves.toBeNull();

    expect(fuentes.reportesPorCalle).not.toHaveBeenCalled();
    expect(fuentes.intervencionesPorCalle).not.toHaveBeenCalled();
  });
});
