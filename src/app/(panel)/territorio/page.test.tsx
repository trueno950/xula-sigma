import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioDeDomicilio } from "@/modules/territorio/ui/FormularioDeDomicilio";
import { VistaDeRaices } from "@/modules/territorio/ui/VistaDeRaices";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  listarCalles: vi.fn(),
  listarCallesDelMunicipio: vi.fn(),
  listarDomicilios: vi.fn(),
  listarLugares: vi.fn(),
  listarRaices: vi.fn(),
  lugarPorId: vi.fn(),
  subarbol: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({
  contextoActual: mocks.contextoActual,
}));

vi.mock("@/modules/territorio", () => ({
  comoCalleId: (id: string) => id,
  comoLugarId: (id: string) => id,
  FormularioDeDomicilio,
  listarCalles: mocks.listarCalles,
  listarCallesDelMunicipio: mocks.listarCallesDelMunicipio,
  listarDomicilios: mocks.listarDomicilios,
  listarLugares: mocks.listarLugares,
  listarRaices: mocks.listarRaices,
  lugarPorId: mocks.lugarPorId,
  subarbol: mocks.subarbol,
  VistaDeLugar: () => null,
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.listarCalles.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([]);
  mocks.listarDomicilios.mockResolvedValue([]);
  mocks.listarLugares.mockResolvedValue([]);
  mocks.listarRaices.mockResolvedValue([]);
  mocks.subarbol.mockResolvedValue([]);
});

describe("Territorio root entry", () => {
  it("ofrece registrar un domicilio como accion primaria y el alta como secundaria", async () => {
    const html = renderToStaticMarkup(
      await PaginaDeTerritorio({ searchParams: Promise.resolve({}) }),
    );

    expect(html.match(/Registrar domicilio/g) ?? []).toHaveLength(1);
    expect(html.match(/Agregar asentamiento/g) ?? []).toHaveLength(1);
    expect(html).toContain('href="/territorio?accion=domicilio"');
  });

  it("con accion=domicilio abre el formulario con Calle antes de la zona", async () => {
    mocks.listarCallesDelMunicipio.mockResolvedValue([
      {
        id: "33333333-3333-4333-8333-333333333333",
        nombre: "Calle 20",
        lugarId: "11111111-1111-4111-8111-111111111111",
        punto: null,
        bajaEn: null,
        asentamiento: "Tepakan",
      },
    ]);
    mocks.listarLugares.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        tipo: "cabecera",
        nombre: "Tepakan",
        padreId: null,
        bajaEn: null,
      },
    ]);

    const html = renderToStaticMarkup(
      await PaginaDeTerritorio({
        searchParams: Promise.resolve({ accion: "domicilio" }),
      }),
    );

    expect(mocks.listarCallesDelMunicipio).toHaveBeenCalled();
    expect(html).toContain("Calle 20 — Tepakan");
    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf('name="zonaId"'),
    );

    const detalles = html.slice(
      html.indexOf("<details"),
      html.indexOf("</details>"),
    );
    expect(detalles).toContain('name="zonaId"');
    expect(html).not.toContain('href="/territorio?accion=domicilio"');
  });

  it("loads the containing settlement catalog for a lower-level domicile", async () => {
    const raiz = {
      id: "11111111-1111-4111-8111-111111111111",
      tipo: "cabecera",
      nombre: "Motul",
      padreId: null,
      bajaEn: null,
    };
    const colonia = {
      id: "22222222-2222-4222-8222-222222222222",
      tipo: "colonia",
      nombre: "Centro",
      padreId: raiz.id,
      bajaEn: null,
    };
    mocks.listarRaices.mockResolvedValue([raiz]);
    mocks.lugarPorId.mockResolvedValue(raiz);
    mocks.subarbol.mockResolvedValue([{ clase: "lugar", ...colonia }]);

    await PaginaDeTerritorio({
      searchParams: Promise.resolve({
        raiz: raiz.id,
        nodo: colonia.id,
        vista: "domicilios",
        accion: "domicilio",
      }),
    });

    expect(mocks.listarCalles).toHaveBeenCalledWith(
      raiz.id,
      expect.objectContaining({ ayuntamientoId: "motul" }),
    );
  });
});
