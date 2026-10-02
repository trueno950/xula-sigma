import type { ReactElement, ReactNode } from "react";
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

vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  // El panel de nodo y el contenido pasan los hijos tal cual: el motivo esta
  // comentado en page.test.tsx, que comparte este montaje.
  PanelDeNodo: ({ children }: { children: ReactNode }) => children,
  ContenidoDeLugar: ({ children }: { children: ReactNode }) => children,
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
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");
const { TerritorioCargado } = await import("./TerritorioCargado");

type CuerpoDeLaPagina = ReactElement<{ children: ReactElement<Props> }>;
type Props = Parameters<typeof TerritorioCargado>[0];

/**
 * Misma tecnica que page.test.tsx: el hijo del Suspense se resuelve a mano.
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

describe("El alta de domicilio desde la entrada", () => {
  it("con accion=domicilio abre el registro plano con calles del municipio", async () => {
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
      await paginaCompleta({ accion: "domicilio" }),
    );

    expect(html).toContain("Calle 20 — Tepakan");
    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf('name="lugarId"'),
    );
    expect(html).not.toContain('href="/territorio?accion=domicilio"');
  });
});
