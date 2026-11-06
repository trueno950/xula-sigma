import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { codificarBorrador } from "@/modules/territorio/ui/borradorDeDomicilio";
import { FormularioDeDomicilio } from "@/modules/territorio/ui/FormularioDeDomicilio";
import { VistaDeRaices } from "@/modules/territorio/ui/VistaDeRaices";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  cookie: vi.fn(),
  listarCallesDelMunicipio: vi.fn(),
  listarLugares: vi.fn(),
  vacio: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("@/modules/territorio/ui/actions/altaDeDomicilioAction", () => ({
  altaDeDomicilioAction: vi.fn(),
}));
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  PanelDeNodo: ({ children }: { children: ReactNode }) => children,
  ContenidoDeLugar: ({ children }: { children: ReactNode }) => children,
  comoCalleId: (id: string) => id,
  comoLugarId: (id: string) => id,
  contarContenidoDeLugares: mocks.vacio,
  FormularioDeDomicilio,
  listarCalles: mocks.vacio,
  listarCallesDelMunicipio: mocks.listarCallesDelMunicipio,
  listarDomicilios: mocks.vacio,
  listarLugares: mocks.listarLugares,
  listarRaices: mocks.vacio,
  lugarPorId: vi.fn(),
  subarbol: mocks.vacio,
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");
const { TerritorioCargado } = await import("./TerritorioCargado");

type Props = Parameters<typeof TerritorioCargado>[0];
type CuerpoDeLaPagina = ReactElement<{ children: ReactElement<Props> }>;

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTRO_TOKEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CALLE = "33333333-3333-4333-8333-333333333333";
const RAIZ = "11111111-1111-4111-8111-111111111111";

/** Mismo montaje que page.test.tsx: el hijo del Suspense se resuelve a mano. */
const altaDeLaEntrada = async (searchParams: Record<string, string>) => {
  const pagina = (await PaginaDeTerritorio({
    searchParams: Promise.resolve({ accion: "domicilio", ...searchParams }),
  })) as CuerpoDeLaPagina;

  return renderToStaticMarkup(
    await TerritorioCargado(pagina.props.children.props),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.vacio.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([
    {
      id: CALLE,
      nombre: "Calle 20",
      lugarId: RAIZ,
      punto: null,
      bajaEn: null,
      asentamiento: "Tepakan",
    },
  ]);
  mocks.listarLugares.mockResolvedValue([
    { id: RAIZ, tipo: "cabecera", nombre: "Tepakan", padreId: null },
  ]);
  mocks.cookie.mockReturnValue({
    value: codificarBorrador({
      token: TOKEN,
      destino: { formulario: "alta" },
      campos: {
        calleId: CALLE,
        zonaId: "",
        numero: "88-B",
        entreCalleAId: "",
        entreCalleBId: "",
        referencia: "Casa de la esquina",
      },
    }),
  });
});

describe("la pagina vuelve a llenar el alta con lo capturado", () => {
  it("con el token del rechazo en la URL, el alta abre con lo capturado", async () => {
    const html = await altaDeLaEntrada({ borrador: TOKEN, error: "Falla" });

    expect(html).toContain('value="88-B"');
    expect(html).toContain('value="Casa de la esquina"');
    // El aviso del error sigue arriba, antes del formulario.
    expect(html.indexOf("Falla")).toBeLessThan(html.indexOf('name="numero"'));
  });

  it("con otro token, o sin token, la cookie no se aplica", async () => {
    const otro = await altaDeLaEntrada({ borrador: OTRO_TOKEN });
    const sinToken = await altaDeLaEntrada({});

    expect(otro).not.toContain("88-B");
    expect(sinToken).not.toContain("88-B");
    // Sin token ni siquiera se lee: ninguna otra visita toca la cookie.
    expect(mocks.cookie).toHaveBeenCalledOnce();
  });

  it("una cookie alterada se ignora y el alta abre vacia", async () => {
    mocks.cookie.mockReturnValue({ value: '{"token":"x"' });

    const html = await altaDeLaEntrada({ borrador: TOKEN });

    expect(html).toContain('name="numero"');
    expect(html).not.toContain("88-B");
  });
});
