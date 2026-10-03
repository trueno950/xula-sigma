import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  // El panel de nodo y el contenido son estructura pura: pasan los hijos tal cual.
  PanelDeNodo: ({ children }: { children: ReactNode }) => children,
  ContenidoDeLugar: ({ children }: { children: ReactNode }) => children,
  comoCalleId: (id: string) => id,
  comoLugarId: (id: string) => id,
  listarCalles: mocks.listarCalles,
  listarCallesDelMunicipio: mocks.listarCallesDelMunicipio,
  listarDomicilios: mocks.listarDomicilios,
  listarLugares: mocks.listarLugares,
  listarRaices: mocks.listarRaices,
  lugarPorId: mocks.lugarPorId,
  subarbol: mocks.subarbol,
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");
const { TerritorioCargado } = await import("./TerritorioCargado");

type CuerpoDeLaPagina = ReactElement<{ children: ReactElement<Props> }>;
type Props = Parameters<typeof TerritorioCargado>[0];

/**
 * La pagina deja lo lento dentro de un Suspense y `renderToStaticMarkup` no
 * espera componentes asincronos: se resuelve el hijo a mano, con las mismas
 * propiedades que la pagina le dio.
 */
const paginaCompleta = async (searchParams: Record<string, string>) => {
  const pagina = (await PaginaDeTerritorio({
    searchParams: Promise.resolve(searchParams),
  })) as CuerpoDeLaPagina;

  return TerritorioCargado(pagina.props.children.props);
};

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
    const html = renderToStaticMarkup(await paginaCompleta({}));

    expect(html.match(/Registrar domicilio/g) ?? []).toHaveLength(1);
    expect(html.match(/Agregar asentamiento/g) ?? []).toHaveLength(1);
    expect(html).toContain('href="/territorio?accion=domicilio"');
  });
});

const RAIZ = "11111111-1111-4111-8111-111111111111";
const HIJO = "22222222-2222-4222-8222-222222222222";

const conColonia = () => {
  mocks.lugarPorId.mockResolvedValue({
    id: RAIZ,
    tipo: "cabecera",
    nombre: "Tepakan",
  });
  mocks.subarbol.mockResolvedValue([
    {
      clase: "lugar",
      id: HIJO,
      tipo: "colonia",
      nombre: "Colonia Centro",
      padreId: RAIZ,
    },
  ]);
};

describe("Territorio: confirmacion de exito", () => {
  it("pinta un solo aviso de exito, politico y sin robar el foco", async () => {
    const html = renderToStaticMarkup(
      await paginaCompleta({ ok: "lugar-creado" }),
    );

    expect(html.match(/Lugar agregado/g) ?? []).toHaveLength(1);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("autofocus");
  });

  it("una clave desconocida no pinta nada", async () => {
    const html = renderToStaticMarkup(
      await paginaCompleta({ ok: "<b>hola</b>" }),
    );

    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("hola");
  });

  it("si hay error, el error gana y no hay confirmacion", async () => {
    const html = renderToStaticMarkup(
      await paginaCompleta({ ok: "lugar-creado", error: "No se pudo" }),
    );

    expect(html).toContain("No se pudo");
    expect(html).not.toContain("Lugar agregado");
  });
});

describe("Territorio: titulo y migaja con contexto", () => {
  it("en la raiz el titulo es Territorio y no hay migaja", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({}));

    expect(html).toMatch(/<h1[^>]*>Territorio<\/h1>/);
    expect(html).not.toContain('aria-label="Ubicación"');
  });

  it("dentro de un lugar el titulo es su nombre, con el tipo como etiqueta", async () => {
    conColonia();
    const html = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, nodo: HIJO }),
    );

    expect(html).toMatch(/<h1[^>]*>Colonia Centro<\/h1>/);
    expect(html).toContain("Colonia");
    expect(html).not.toContain("font-mono");
    expect(html.match(/Colonia Centro/g) ?? []).toHaveLength(2);
  });

  it("el primer eslabon siempre es Territorio hacia /territorio", async () => {
    conColonia();
    const html = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, nodo: HIJO }),
    );

    expect(html).toMatch(/<a[^>]*href="\/territorio"[^>]*>Territorio<\/a>/);
    expect(html).not.toContain(">Lugares</a>");
  });
});
