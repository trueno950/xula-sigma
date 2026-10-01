import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Fuga de datos personales en el HTML de `/validar/[folio]` (design.md de
 * `constancias-oficios`, seccion 13): sin `codigo` correcto, ni el titular
 * ni la direccion pueden aparecer en ningun texto renderizado, **ni
 * siquiera en un atributo oculto**. El tercer caso -codigo correcto- es el
 * control positivo: sin el, los dos primeros pasarian aunque la pagina
 * nunca renderizara nada.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());
const limitarRitmoMock = vi.hoisted(() => vi.fn());
const exigirAyuntamientoMock = vi.hoisted(() => vi.fn());
const validarFolioMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: leerCabeceras }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth/limitarRitmo", () => ({
  limitarRitmo: limitarRitmoMock,
}));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: exigirAyuntamientoMock,
  superficieActual: vi.fn().mockResolvedValue("ayuntamiento"),
}));
vi.mock("@/modules/constancias", () => ({ validarFolio: validarFolioMock }));

const { default: PaginaDeValidacion } = await import("./page");

const TENANT = "11111111-1111-1111-1111-111111111111";

const propsDe = (c?: string) => ({
  params: Promise.resolve({ folio: "VEC-2026-000001" }),
  searchParams: Promise.resolve(c === undefined ? {} : { c }),
});

const htmlDe = async (c?: string) =>
  renderToStaticMarkup(await PaginaDeValidacion(propsDe(c)));

describe("fuga de datos personales en /validar/[folio]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leerCabeceras.mockResolvedValue({
      get: (n: string) =>
        n === "x-xula-superficie" ? "ayuntamiento" : "189.203.10.7",
    });
    exigirAyuntamientoMock.mockResolvedValue({ id: TENANT });
    limitarRitmoMock.mockResolvedValue(undefined);
  });

  it("folio no valido: ni titular ni direccion en ningun texto ni atributo", async () => {
    validarFolioMock.mockResolvedValue({ estado: "NO_VALIDO" });

    const html = await htmlDe();

    expect(html).not.toContain("Titular");
    expect(html).not.toContain("Dirección");
  });

  it("sin codigo, nivel 1: ni titular ni direccion, aunque el documento sea vigente", async () => {
    validarFolioMock.mockResolvedValue({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: "2026-01-15T10:00:00.000Z",
    });

    const html = await htmlDe();

    expect(html).not.toContain("Titular");
    expect(html).not.toContain("Dirección");
  });

  it("control positivo: con codigo correcto (nivel 2) si muestra titular y direccion", async () => {
    validarFolioMock.mockResolvedValue({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: "2026-01-15T10:00:00.000Z",
      titular: "Juan Poot",
      direccion: "Calle 10, Motul",
    });

    const html = await htmlDe("codigo-correcto");

    expect(html).toContain("Juan Poot");
    expect(html).toContain("Calle 10, Motul");
    expect(html).toContain("Dirección");
  });
});
