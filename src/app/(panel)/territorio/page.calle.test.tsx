import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contarContenidoDeLugares: vi.fn(),
  contextoActual: vi.fn(),
  listarCalles: vi.fn(),
  listarCallesDelMunicipio: vi.fn(),
  listarDomicilios: vi.fn(),
  listarLugares: vi.fn(),
  listarRaices: vi.fn(),
  lugarPorId: vi.fn(),
  notFound: vi.fn(),
  registroDeDomicilios: vi.fn(async () => ({ domicilios: [], hayMas: false })),
  subarbol: vi.fn(),
  usoDeCalle: vi.fn(async () => null),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));

// Solo los casos de uso son dobles: el panel del nodo, su contenido y la
// pestana de Calles son los reales, para probar el cableado de `?calle=`
// hasta el panel que se abre (mismo montaje que `page.conteos.test.tsx`).
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  ...(await vi.importActual<
    typeof import("@/modules/territorio/ui/ContenidoDeLugar")
  >("@/modules/territorio/ui/ContenidoDeLugar")),
  ...(await vi.importActual<
    typeof import("@/modules/territorio/ui/PanelDeNodo")
  >("@/modules/territorio/ui/PanelDeNodo")),
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
  usoDeCalle: mocks.usoDeCalle,
}));

const { default: PaginaDeTerritorio } = await import("./page");

const RAIZ = "11111111-1111-4111-8111-111111111111";
const CALLE = "33333333-3333-4333-8333-333333333333";
const AJENA = "44444444-4444-4444-8444-444444444444";

const paginaCompleta = (searchParams: Record<string, string>) =>
  PaginaDeTerritorio({ searchParams: Promise.resolve(searchParams) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.contarContenidoDeLugares.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([]);
  mocks.listarDomicilios.mockResolvedValue([]);
  mocks.listarLugares.mockResolvedValue([
    { id: RAIZ, tipo: "cabecera", nombre: "Tepakan", padreId: null },
  ]);
  mocks.listarRaices.mockResolvedValue([
    { id: RAIZ, tipo: "cabecera", nombre: "Tepakan", padreId: null },
  ]);
  mocks.lugarPorId.mockResolvedValue({
    id: RAIZ,
    tipo: "cabecera",
    nombre: "Tepakan",
  });
  mocks.listarCalles.mockResolvedValue([
    { id: CALLE, nombre: "Calle 20", lugarId: RAIZ, punto: null },
  ]);
  mocks.subarbol.mockResolvedValue([]);
});

/**
 * C1 de `odd/tasks/territorio-ux.md` (S7): el enlace a una calle no decia
 * `?vista=calles`, caia en Colonias y la calle no se abria sin aviso.
 */
describe("Territorio: una calle abierta desde la URL", () => {
  it("un ?calle= sin ?vista= abre el panel de la calle en la pestana Calles", async () => {
    const html = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, calle: CALLE }),
    );

    expect(html).toContain('id="panel-de-calle"');
    expect(html).toMatch(/<h2[^>]*>Calle 20<\/h2>/);
    const pestanaCalles = html.match(
      new RegExp(
        `<a[^>]*href="/territorio\\?raiz=${RAIZ}&amp;nodo=${RAIZ}&amp;vista=calles"[^>]*>`,
      ),
    )?.[0];
    expect(pestanaCalles).toContain('aria-current="page"');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("el ?calle= de otro municipio sigue siendo 404", async () => {
    mocks.listarCalles.mockResolvedValue([]);

    await paginaCompleta({ raiz: RAIZ, calle: AJENA });

    expect(mocks.notFound).toHaveBeenCalled();
  });
});
