import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  registroDeDomicilios: vi.fn(async () => ({ domicilios: [], hayMas: false })),
  subarbol: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
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
  listarDomicilios: mocks.listarDomicilios,
  listarLugares: mocks.listarLugares,
  listarRaices: mocks.listarRaices,
  lugarPorId: mocks.lugarPorId,
  registroDeDomicilios: mocks.registroDeDomicilios,
  subarbol: mocks.subarbol,
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");

const pagina = async (searchParams: Record<string, string>) =>
  renderToStaticMarkup(
    await PaginaDeTerritorio({ searchParams: Promise.resolve(searchParams) }),
  );

/** Un `<a>` con ese destino exacto y ese texto, en cualquier orden de atributos. */
const enlace = (href: string, texto: string) =>
  new RegExp(`<a[^>]*href="${href.replace(/[?]/g, "\\?")}"[^>]*>${texto}</a>`);

const KINI = "11111111-1111-4111-8111-111111111111";
const NUEVA = "22222222-2222-4222-8222-222222222222";
const AJENA = "99999999-9999-4999-8999-999999999999";

const kini = { id: KINI, tipo: "comisaria", nombre: "Kiní", padreId: null };
const nueva = {
  id: NUEVA,
  tipo: "colonia",
  nombre: "Colonia Prueba UX",
  padreId: KINI,
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
  mocks.listarLugares.mockResolvedValue([kini, nueva]);
  mocks.listarRaices.mockResolvedValue([kini]);
  mocks.lugarPorId.mockResolvedValue(kini);
  mocks.subarbol.mockResolvedValue([{ clase: "lugar", ...nueva }]);
});

/** S3: la confirmacion del alta lleva al lugar que se acaba de crear. */
describe("Territorio: confirmacion del alta de lugar", () => {
  it("nombra el tipo y enlaza al lugar nuevo, con el nombre de los datos", async () => {
    const html = await pagina({
      raiz: KINI,
      ok: "lugar-creado",
      nuevo: NUEVA,
    });

    expect(html).toContain("Colonia agregada.");
    expect(html).toMatch(
      enlace(
        `/territorio?raiz=${KINI}&amp;nodo=${NUEVA}`,
        "Ver Colonia Prueba UX",
      ),
    );
  });

  it("un asentamiento nuevo enlaza a su propia vista", async () => {
    const html = await pagina({ ok: "lugar-creado", nuevo: KINI });

    expect(html).toContain("Comisaría agregada.");
    expect(html).toMatch(enlace(`/territorio?raiz=${KINI}`, "Ver Kiní"));
  });

  it("un id que no esta en lo cargado deja solo el mensaje", async () => {
    const html = await pagina({ ok: "lugar-creado", nuevo: AJENA });

    expect(html.match(/Lugar agregado/g) ?? []).toHaveLength(1);
    expect(html).not.toMatch(/>Ver (Kiní|Colonia Prueba UX)</);
    expect(html).not.toContain(AJENA);
  });

  it("las demas confirmaciones no llevan enlace aunque traigan `nuevo`", async () => {
    const html = await pagina({ ok: "calle-creada", nuevo: NUEVA });

    expect(html).toContain("Calle agregada.");
    expect(html).not.toContain("Ver Colonia Prueba UX");
  });
});
