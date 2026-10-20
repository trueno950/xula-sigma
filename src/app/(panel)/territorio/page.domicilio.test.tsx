import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioDeDomicilio } from "@/modules/territorio/ui/FormularioDeDomicilio";
import { VistaDeRaices } from "@/modules/territorio/ui/VistaDeRaices";

const mocks = vi.hoisted(() => ({
  contarContenidoDeLugares: vi.fn(),
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
  contarContenidoDeLugares: mocks.contarContenidoDeLugares,
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
  mocks.contarContenidoDeLugares.mockResolvedValue([]);
  mocks.listarCalles.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([]);
  mocks.listarDomicilios.mockResolvedValue([]);
  mocks.listarLugares.mockResolvedValue([]);
  mocks.listarRaices.mockResolvedValue([]);
  mocks.subarbol.mockResolvedValue([]);
});

const RAIZ = "11111111-1111-4111-8111-111111111111";
const HIJO = "22222222-2222-4222-8222-222222222222";

const conLugarDeUnaCalle = (rol: string) => {
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol },
    origen: "web",
  });
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
      nombre: "Centro",
      padreId: RAIZ,
    },
  ]);
  mocks.listarCalles.mockResolvedValue([
    {
      id: "33333333-3333-4333-8333-333333333333",
      nombre: "Calle 20",
      lugarId: RAIZ,
      punto: null,
    },
  ]);
};

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
    // Un municipio recien creado tiene una cabecera y ninguna colonia: ahi
    // el `<select>` de Colonia salia con el marcador solo, sin decir por que.
    expect(html).toContain("Sin colonias registradas");
    expect(html).toContain(
      "Todavía no hay colonias, sectores ni manzanas en el municipio",
    );
  });
});

describe("El alta de domicilio dentro del lugar", () => {
  it("un OPERADOR ve el enlace y abre el formulario con su raiz y su nodo", async () => {
    conLugarDeUnaCalle("OPERADOR");

    const enlace = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, vista: "domicilios" }),
    );
    const formulario = renderToStaticMarkup(
      await paginaCompleta({
        raiz: RAIZ,
        nodo: HIJO,
        vista: "domicilios",
        accion: "domicilio",
      }),
    );

    expect(enlace).toContain("Registrar domicilio");
    expect(formulario).toContain('name="calleId"');
    expect(formulario).toContain(`name="raiz" value="${RAIZ}"`);
    expect(formulario).toContain(`name="nodo" value="${HIJO}"`);
  });

  it("un CONSULTA no ve el enlace ni el formulario del lugar", async () => {
    conLugarDeUnaCalle("CONSULTA");

    const enlace = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, vista: "domicilios" }),
    );
    const formulario = renderToStaticMarkup(
      await paginaCompleta({
        raiz: RAIZ,
        nodo: HIJO,
        vista: "domicilios",
        accion: "domicilio",
      }),
    );

    expect(enlace).not.toContain("Registrar domicilio");
    expect(formulario).not.toContain('name="calleId"');
  });
});
