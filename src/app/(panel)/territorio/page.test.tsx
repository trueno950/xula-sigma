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
