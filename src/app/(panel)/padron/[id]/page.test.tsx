import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  personaPorId: vi.fn(),
  sugerirDuplicados: vi.fn(),
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
  sugerirDuplicados: mocks.sugerirDuplicados,
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
vi.mock("@/modules/padron/ui/actions/editarPersona.action", () => ({
  editarPersonaAction: "editar",
}));
vi.mock("@/modules/padron/ui/actions/darDeBajaPersona.action", () => ({
  darDeBajaPersonaAction: "baja",
}));
vi.mock("@/modules/padron/ui/actions/fusionarPersonas.action", () => ({
  fusionarPersonasAction: "fusionar",
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
  mocks.sugerirDuplicados.mockResolvedValue([]);
});

describe("ficha de una persona", () => {
  it("solo un rol que escribe carga los domicilios y ve la mudanza", async () => {
    expect(await renderComo("CONSULTA")).not.toContain("Registrar mudanza");
    expect(mocks.listarDomicilios).not.toHaveBeenCalled();

    expect(await renderComo("OPERADOR")).toContain("Registrar mudanza");
    expect(mocks.listarDomicilios).toHaveBeenCalledTimes(1);
  });

  it("sin `?pestana=` abre en el historial, con el nombre como titulo", async () => {
    const pagina = await renderComo("OPERADOR");

    expect(pagina).toContain("<h1");
    expect(pagina).toContain("Juan Poot");
    expect(pagina).toContain("Historial de residencias");
    expect(pagina).not.toContain("Administrar la ficha");
    expect(pagina).toMatch(/aria-current="page"[^>]*>Residencias/);
  });

  it("`?pestana=administrar` abre el acordeon y no el historial", async () => {
    const pagina = await renderComo("ADMIN_MUNICIPAL", {
      pestana: "administrar",
    });

    expect(pagina).toContain("Administrar la ficha");
    expect(pagina).not.toContain("Historial de residencias");
    expect(pagina).toMatch(/aria-current="page"[^>]*>Administrar/);
  });

  it("un rol de solo lectura con `?pestana=administrar` se queda en Residencias y ve el aviso", async () => {
    const pagina = await renderComo("CONSULTA", { pestana: "administrar" });

    expect(pagina).not.toContain("Administrar la ficha");
    expect(pagina).not.toContain("Corregir datos");
    expect(pagina).toContain("Historial de residencias");
    expect(pagina).toContain("Su rol no permite");
  });

  it("el error que devuelve una accion de la ficha se pinta en la ficha", async () => {
    const pagina = await renderComo("ADMIN_MUNICIPAL", {
      pestana: "administrar",
      error: "No se pudieron guardar los cambios. Intente de nuevo.",
    });

    expect(pagina).toContain(
      "No se pudieron guardar los cambios. Intente de nuevo.",
    );
  });

  it("la mudanza va plegada con la misma `name` que el acordeon de Administrar", async () => {
    const pliegues = (
      await renderComo("ADMIN_MUNICIPAL", { pestana: "administrar" })
    ).match(/<details[^>]*>/g);

    expect(pliegues?.length).toBe(4);
    for (const pliegue of pliegues ?? []) {
      expect(pliegue).toContain('name="acciones-de-la-ficha"');
    }
  });

  it("sin residencias la mudanza se abre sola: no hay nada que plegar", async () => {
    const mudanza = (await renderComo("OPERADOR")).match(
      /<details[^>]*>/g,
    )?.[0];

    expect(mudanza).toContain("open");
  });

  it("un operador administra su ficha pero no ve la fusion, que pide otro permiso", async () => {
    const pagina = await renderComo("OPERADOR", { pestana: "administrar" });

    expect(pagina).toContain("Corregir datos");
    expect(pagina).not.toContain("Fusionar con otra persona");
    expect(mocks.sugerirDuplicados).not.toHaveBeenCalled();
  });

  it("las personas parecidas se piden solo cuando la fusion se va a pintar", async () => {
    await renderComo("ADMIN_MUNICIPAL");
    expect(mocks.sugerirDuplicados).not.toHaveBeenCalled();

    await renderComo("ADMIN_MUNICIPAL", { pestana: "administrar" });
    expect(mocks.sugerirDuplicados).toHaveBeenCalledTimes(1);
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
      ["es de otro municipio", "99999999-9999-4999-8999-999999999999"],
    ])("un domicilio que %s se ignora sin error", async (_caso, domicilio) => {
      const props = await preseleccionadoCon(domicilio);

      expect(props).toMatchObject({ domicilioRecienCreado: true });
      expect(props).not.toHaveProperty("domicilioPreseleccionado");
    });
  });
});
