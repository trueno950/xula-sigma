import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { porciones } from "@/app/exportacion/porciones";
import { nombresDeConjuntos } from "@/shared/exportacion/inventario";

/**
 * El inventario antes de descargar (S10 y S11 de `marca-exportacion-ux`): que
 * archivos lleva el ZIP, con los datos del personal avisados arriba, y cuantas
 * filas trae cada uno.
 *
 * La lista sale de las mismas porciones que arma el ZIP —no de una copia a
 * mano—, asi que aca se recorren las de verdad: un conjunto nuevo aparece en
 * las dos o en ninguna. Los conteos reales y el aislamiento los cubre
 * `inventarioDeExportacion.isolation.test.ts`.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const inventarioMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/app/exportacion/inventarioDeExportacion", () => ({
  inventarioDeExportacion: inventarioMock,
}));

const { default: PaginaDeExportacion } = await import("./page");

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "https://motul.xulasigma.mx",
};

const conjuntos = nombresDeConjuntos(porciones).map((nombre, indice) => ({
  nombre,
  filas: 1000 + indice,
}));

const inventario = {
  archivo: "motul-2026-11-21.zip",
  tieneEscudo: false,
  conjuntos,
};

const pintar = async (
  deLaBase: typeof inventario = inventario,
): Promise<string> => {
  inventarioMock.mockResolvedValue(deLaBase);

  return renderToStaticMarkup(
    await PaginaDeExportacion({ searchParams: Promise.resolve({}) }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto);
});

describe("el inventario antes de descargar (S10)", () => {
  it("lista usuarios.csv y bitacora.csv con el resto de los conjuntos", async () => {
    const html = await pintar();

    expect(html).toContain("usuarios.csv");
    expect(html).toContain("bitacora.csv");
    expect(html).toContain("personas.csv");
    expect(html).toContain("revisiones_de_intervenciones.csv");
    expect(html).toContain("manifiesto.json");
  });

  it("avisa que lleva datos del personal y que el ZIP no se puede recortar", async () => {
    const html = await pintar();

    expect(html).toContain(
      "El archivo lleva datos del personal del ayuntamiento.",
    );
    expect(html).toContain("El ZIP va completo");
    expect(html).toContain("datos del personal");
  });

  it("dice cuantos archivos lleva el ZIP, con manifiesto y sin escudo", async () => {
    const html = await pintar();

    expect(html).toContain(`${conjuntos.length + 1} archivos`);
  });

  it("si el municipio tiene escudo, el inventario lo cuenta", async () => {
    const html = await pintar({ ...inventario, tieneEscudo: true });

    expect(html).toContain(`${conjuntos.length + 2} archivos`);
    expect(html).toContain("escudo.png");
  });
});

describe("los conteos (S11)", () => {
  it("cada conjunto dice cuantas filas lleva", async () => {
    const html = await pintar();

    expect(html).toContain("1,000");
    expect(html).toContain("1,001");
  });

  it("cada grupo y la pantalla entera suman sus filas", async () => {
    const html = await pintar();
    const total = conjuntos.reduce(
      (suma, conjunto) => suma + conjunto.filas,
      0,
    );

    expect(html).toContain("2 archivos · 2,001 filas");
    expect(html).toContain(`${total.toLocaleString("es-MX")} filas`);
  });
});
