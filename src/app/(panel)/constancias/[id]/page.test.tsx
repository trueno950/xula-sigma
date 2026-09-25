import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const constanciaPorIdMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/constancias", () => ({
  BotonDeCancelacion: () => null,
  BotonDeImprimir: () => <a href="/constancias/x/pdf">Imprimir</a>,
  BotonDeReimpresion: () => null,
  comoConstanciaId: (id: string) => id,
  constanciaPorId: constanciaPorIdMock,
  esquemaDeSnapshot: { parse: (dato: unknown) => dato },
}));

const { default: PaginaDeDetalleDeConstancia } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";

const vigente = {
  id: ID,
  folio: "VEC-2026-000001",
  emitidaEn: new Date("2026-01-01T18:00:00Z"),
  canceladaEn: null,
  motivoCancelacion: null,
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: { texto: "Calle 20 #10", desdeEn: "2024-01-01" },
  },
};

const cancelada = {
  ...vigente,
  canceladaEn: new Date("2026-02-01T18:00:00Z"),
  motivoCancelacion: "ERROR_DE_CAPTURA",
};

const html = async () =>
  renderToStaticMarkup(
    await PaginaDeDetalleDeConstancia({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
});

describe("detalle de una constancia", () => {
  it("una constancia vigente ofrece Imprimir", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    expect(await html()).toContain("Imprimir");
  });

  it("una constancia cancelada no ofrece Imprimir y sigue mostrando el registro", async () => {
    constanciaPorIdMock.mockResolvedValue(cancelada);

    const pagina = await html();

    expect(pagina).not.toContain("Imprimir");
    expect(pagina).toContain("Documento cancelado");
    expect(pagina).toContain("Juan Poot");
    expect(pagina).toContain("VEC-2026-000001");
  });
});
