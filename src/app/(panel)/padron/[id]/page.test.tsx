import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  personaPorId: vi.fn(),
  historialDeResidencias: vi.fn(),
  listarDomicilios: vi.fn(),
  registroDeMudanza: vi.fn(),
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
  RegistroDeMudanza: (props: unknown) => {
    mocks.registroDeMudanza(props);
    return <p>Registrar mudanza</p>;
  },
}));

const { default: PaginaDeDetalleDePersona } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";

const renderComo = async (
  rol: string,
  parametros: Record<string, string> = {},
) => {
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol },
    origen: "web",
  });
  return renderToStaticMarkup(
    await PaginaDeDetalleDePersona({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve(parametros),
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

  describe("domicilio recien creado desde la ficha", () => {
    const DOMICILIO = "22222222-2222-4222-8222-222222222222";
    const preseleccionadoCon = async (domicilio: string) => {
      await renderComo("OPERADOR", { ok: "domicilio-creado", domicilio });
      return mocks.registroDeMudanza.mock.calls[0]?.[0];
    };

    beforeEach(() => {
      mocks.listarDomicilios.mockResolvedValue([
        {
          id: DOMICILIO,
          calle: "Calle 38",
          calleId: "33333333-3333-4333-8333-333333333333",
          numero: "157",
          lugar: "Centro",
        },
      ]);
    });

    it("un domicilio del municipio llega preseleccionado a la mudanza", async () => {
      expect(await preseleccionadoCon(DOMICILIO)).toMatchObject({
        domicilioRecienCreado: true,
        domicilioPreseleccionado: DOMICILIO,
      });
    });

    it.each([
      ["no es uuid", "Calle 38 157"],
      [
        "no es de los domicilios de este municipio",
        "99999999-9999-4999-8999-999999999999",
      ],
    ])("un domicilio que %s se ignora sin error", async (_caso, domicilio) => {
      const props = await preseleccionadoCon(domicilio);

      expect(props).toMatchObject({ domicilioRecienCreado: true });
      expect(props).not.toHaveProperty("domicilioPreseleccionado");
    });
  });
});
