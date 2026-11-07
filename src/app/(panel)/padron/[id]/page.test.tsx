import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  personaPorId: vi.fn(),
  historialDeResidencias: vi.fn(),
  listarDomicilios: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("@/modules/padron", async () => ({
  ...(await vi.importActual<typeof import("@/modules/padron")>(
    "@/modules/padron",
  )),
  personaPorId: mocks.personaPorId,
}));
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio")>(
    "@/modules/territorio",
  )),
  historialDeResidencias: mocks.historialDeResidencias,
  listarDomicilios: mocks.listarDomicilios,
  HistorialDeResidencias: () => null,
  RegistroDeMudanza: () => <p>Registrar mudanza</p>,
}));

const { default: PaginaDeDetalleDePersona } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";

const renderComo = async (rol: string) => {
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol },
    origen: "web",
  });
  return renderToStaticMarkup(
    await PaginaDeDetalleDePersona({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.personaPorId.mockResolvedValue({
    id: ID,
    nombres: "Juan",
    primerApellido: "Poot",
    segundoApellido: null,
    curp: null,
  });
  mocks.historialDeResidencias.mockResolvedValue([]);
  mocks.listarDomicilios.mockResolvedValue([]);
});

describe("ficha de una persona", () => {
  it("un rol de solo lectura no carga los domicilios de la mudanza", async () => {
    const pagina = await renderComo("CONSULTA");

    expect(pagina).not.toContain("Registrar mudanza");
    expect(mocks.listarDomicilios).not.toHaveBeenCalled();
  });

  it("un rol que escribe carga los domicilios y ve la mudanza", async () => {
    const pagina = await renderComo("OPERADOR");

    expect(pagina).toContain("Registrar mudanza");
    expect(mocks.listarDomicilios).toHaveBeenCalledTimes(1);
  });
});
