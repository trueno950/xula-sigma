import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CalleGuardada,
  DomicilioParaListado,
  LugarGuardado,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";

const listarLugaresMock = vi.hoisted(() => vi.fn());
const callesParaMapaMock = vi.hoisted(() => vi.fn());
const listarDomiciliosMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/territorio", async (importarOriginal) => ({
  ...(await importarOriginal<typeof import("@/modules/territorio")>()),
  listarLugares: listarLugaresMock,
  callesParaMapa: callesParaMapaMock,
  listarDomicilios: listarDomiciliosMock,
}));

const { crearLectorDeNombresPorTerritorio } = await import(
  "./lectorDeNombresPorTerritorio"
);

const contexto = {
  ayuntamientoId: "motul",
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
} as unknown as ContextoActual;

const lugar = (
  id: string,
  nombre: string,
  padreId: string | null,
): LugarGuardado =>
  ({
    id,
    tipo: padreId === null ? "cabecera" : "colonia",
    nombre,
    padreId,
    bajaEn: null,
  }) as unknown as LugarGuardado;

const lugaresDePrueba = () => [
  lugar("cabecera", "Motul", null),
  lugar("comisaria", "Comisaria Norte", "cabecera"),
  lugar("colonia", "Colonia Centro", "comisaria"),
];

const calle = (id: string, nombre: string): CalleGuardada =>
  ({
    id,
    nombre,
    lugarId: "colonia",
    punto: null,
    bajaEn: new Date("2026-01-01T00:00:00Z"),
  }) as unknown as CalleGuardada;

const domicilio = (): DomicilioParaListado =>
  ({
    id: "domicilio-1",
    calle: "Calle 20",
    calleId: "calle-1",
    numero: "42-B",
    lugar: "Colonia Centro",
  }) as unknown as DomicilioParaListado;

describe("lectorDeNombresPorTerritorio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarLugaresMock.mockResolvedValue(lugaresDePrueba());
    callesParaMapaMock.mockResolvedValue([calle("calle-1", "Calle 20")]);
    listarDomiciliosMock.mockResolvedValue([domicilio()]);
  });

  it("nombra el lugar con la raiz de su jerarquia, para el enlace al mapa", async () => {
    const catalogo = await crearLectorDeNombresPorTerritorio(contexto).leer({
      lugares: ["colonia"],
      calles: [],
      domicilios: [],
    });

    expect(catalogo.lugares.get("colonia")).toEqual({
      nombre: "Colonia Centro",
      raizId: "cabecera",
    });
  });

  it("nombra la calle aunque este dada de baja: el reporte viejo sigue diciendo donde fue", async () => {
    const catalogo = await crearLectorDeNombresPorTerritorio(contexto).leer({
      lugares: [],
      calles: ["calle-1"],
      domicilios: [],
    });

    expect(catalogo.calles.get("calle-1")).toBe("Calle 20");
  });

  it("arma la etiqueta del domicilio con el formato de Territorio", async () => {
    const catalogo = await crearLectorDeNombresPorTerritorio(contexto).leer({
      lugares: [],
      calles: [],
      domicilios: ["domicilio-1"],
    });

    expect(catalogo.domicilios.get("domicilio-1")).toBe(
      "Calle 20 #42-B, Colonia Centro",
    );
  });

  it("una sola lectura por catalogo, y ninguna del que no se pidio", async () => {
    await crearLectorDeNombresPorTerritorio(contexto).leer({
      lugares: ["colonia"],
      calles: ["calle-1"],
      domicilios: [],
    });

    expect(listarLugaresMock).toHaveBeenCalledTimes(1);
    expect(callesParaMapaMock).toHaveBeenCalledTimes(1);
    expect(listarDomiciliosMock).not.toHaveBeenCalled();
    expect(listarLugaresMock).toHaveBeenCalledWith(contexto);
  });

  it("no inventa raiz cuando la jerarquia no llega al catalogo", async () => {
    listarLugaresMock.mockResolvedValue([
      lugar("colonia", "Colonia Centro", "perdido"),
    ]);

    const catalogo = await crearLectorDeNombresPorTerritorio(contexto).leer({
      lugares: ["colonia", "ajeno"],
      calles: [],
      domicilios: [],
    });

    expect(catalogo.lugares.get("colonia")).toEqual({
      nombre: "Colonia Centro",
      raizId: null,
    });
    expect(catalogo.lugares.has("ajeno")).toBe(false);
  });
});
