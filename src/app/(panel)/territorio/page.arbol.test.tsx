import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VistaDeRaices } from "@/modules/territorio/ui/VistaDeRaices";

const mocks = vi.hoisted(() => ({
  contarContenidoDeLugares: vi.fn(),
  contextoActual: vi.fn(),
  listarCalles: vi.fn(),
  listarCallesDelMunicipio: vi.fn(),
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
  PanelDeNodo: ({ children }: { children: ReactNode }) => children,
  ContenidoDeLugar: ({ children }: { children: ReactNode }) => children,
  comoCalleId: (id: string) => id,
  comoLugarId: (id: string) => id,
  contarContenidoDeLugares: mocks.contarContenidoDeLugares,
  listarCalles: mocks.listarCalles,
  listarCallesDelMunicipio: mocks.listarCallesDelMunicipio,
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

const paginaCompleta = async (searchParams: Record<string, string>) => {
  const pagina = (await PaginaDeTerritorio({
    searchParams: Promise.resolve(searchParams),
  })) as CuerpoDeLaPagina;

  return TerritorioCargado(pagina.props.children.props);
};

const CABECERA = "33333333-3333-4333-8333-333333333333";
const COLONIA = "44444444-4444-4444-8444-444444444444";
const lugares = [
  {
    id: CABECERA,
    tipo: "cabecera",
    nombre: "Buenavista",
    padreId: null,
    bajaEn: null,
  },
  {
    id: COLONIA,
    tipo: "colonia",
    nombre: "Colonia Centro",
    padreId: CABECERA,
    bajaEn: null,
  },
];

const entrarComo = (rol: string) =>
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol },
    origen: "web",
  });

beforeEach(() => {
  vi.clearAllMocks();
  entrarComo("ADMIN_MUNICIPAL");
  mocks.listarCalles.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([]);
  mocks.subarbol.mockResolvedValue([]);
  mocks.listarRaices.mockResolvedValue([lugares[0]]);
  mocks.listarLugares.mockResolvedValue(lugares);
  mocks.contarContenidoDeLugares.mockResolvedValue([
    { lugarId: CABECERA, domicilios: 9, calles: 0 },
    { lugarId: COLONIA, domicilios: 4, calles: null },
  ]);
});

describe("Territorio: entrada con arbol, cuentas y busqueda", () => {
  it("lee las cuentas una sola vez por pantalla y las pinta", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({}));

    expect(mocks.contarContenidoDeLugares).toHaveBeenCalledTimes(1);
    expect(html).toContain("9 domicilios");
    expect(html).toContain("Sin calles");
  });

  it("ofrece el registro de domicilios a cualquier rol con lectura", async () => {
    entrarComo("CONSULTA");

    const html = renderToStaticMarkup(await paginaCompleta({}));

    expect(html).toContain('href="/territorio/domicilios"');
    expect(html).toContain("Ver registro de domicilios");
    expect(html).not.toContain("Registrar domicilio");
  });

  it("filtra por ?q= sin acentos y muestra el filtro aplicado", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({ q: "CENTRO" }));

    expect(html).toContain("Colonia Centro");
    expect(html).toContain("Quitar filtro: Búsqueda: CENTRO");
  });

  it("una busqueda sin resultados nombra la busqueda y no el vacio inicial", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({ q: "zzzz" }));

    expect(html).toContain("Sin resultados para");
    expect(html).toContain("zzzz");
    expect(html).not.toContain("todavía no tiene asentamientos");
  });

  it("con ?raiz= calcula las cuentas: alimentan las filas de Lugares", async () => {
    mocks.lugarPorId.mockResolvedValue({
      id: CABECERA,
      tipo: "cabecera",
      nombre: "Buenavista",
    });

    await paginaCompleta({ raiz: CABECERA });

    expect(mocks.contarContenidoDeLugares).toHaveBeenCalledTimes(1);
  });
});
