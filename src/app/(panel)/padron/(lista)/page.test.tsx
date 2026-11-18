import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoPersonaId } from "@/modules/padron";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  listarPersonas: vi.fn(),
  buscarPersonas: vi.fn(),
  domiciliosVigentesDe: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));
vi.mock("@/modules/padron", async () => ({
  ...(await vi.importActual<typeof import("@/modules/padron")>(
    "@/modules/padron",
  )),
  listarPersonas: mocks.listarPersonas,
  buscarPersonas: mocks.buscarPersonas,
}));
vi.mock("./domiciliosVigentes", () => ({
  domiciliosVigentesDe: mocks.domiciliosVigentesDe,
}));

const { default: PaginaDePadron } = await import("./page");

const POOT = comoPersonaId("11111111-1111-4111-8111-111111111111");
const MAY = comoPersonaId("22222222-2222-4222-8222-222222222222");

const CONTEXTO = {
  ayuntamientoId: "motul",
  usuario: { id: "u1", rol: "OPERADOR" },
  origen: "web",
};

const renderComo = async (
  parametros: Record<string, string> = {},
  rol = "OPERADOR",
) => {
  mocks.contextoActual.mockResolvedValue({
    ...CONTEXTO,
    usuario: { ...CONTEXTO.usuario, rol },
  });

  const elemento = await PaginaDePadron({
    searchParams: Promise.resolve(parametros),
  });

  return renderToStaticMarkup(elemento);
};

beforeEach(() => {
  vi.clearAllMocks();
  const personas = [
    {
      id: POOT,
      nombres: "María Guadalupe",
      primerApellido: "Poot",
      segundoApellido: "Canul",
      curp: null,
      bajaEn: null,
    },
    {
      id: MAY,
      nombres: "José",
      primerApellido: "May",
      segundoApellido: null,
      curp: "MACA050312HYNSLL09",
      bajaEn: null,
    },
  ];

  mocks.listarPersonas.mockResolvedValue({ personas, hayMas: false });
  mocks.buscarPersonas.mockResolvedValue({ personas, hayMas: false });
  mocks.domiciliosVigentesDe.mockResolvedValue(
    new Map([[POOT, "Calle 20 #42, Colonia Centro"]]),
  );
});

describe("la página del padrón resuelve el domicilio vigente (S1)", () => {
  it("pide en lote el domicilio de las personas de la página, una sola vez", async () => {
    await renderComo();

    expect(mocks.domiciliosVigentesDe).toHaveBeenCalledTimes(1);
    expect(mocks.domiciliosVigentesDe).toHaveBeenCalledWith(
      [POOT, MAY],
      expect.objectContaining({ ayuntamientoId: "motul" }),
    );
  });

  it("la etiqueta que devuelve la lectura se pinta en la fila de esa persona", async () => {
    expect(await renderComo()).toContain("Calle 20 #42");
  });
});

describe("la página del padrón conserva búsqueda y permisos (S13)", () => {
  it("con `?q=` busca, y le pasa el límite a la lectura", async () => {
    await renderComo({ q: "poot", limite: "100" });

    expect(mocks.buscarPersonas).toHaveBeenCalledWith(
      "poot",
      expect.anything(),
      { limite: 100 },
    );
    expect(mocks.listarPersonas).not.toHaveBeenCalled();
  });

  it("con dos `?q=` cae al listado en vez de romper la pantalla", async () => {
    await renderComo({ q: ["a", "b"] as never });

    expect(mocks.buscarPersonas).not.toHaveBeenCalled();
    expect(mocks.listarPersonas).toHaveBeenCalledTimes(1);
  });

  it("un rol de solo lectura no ve la acción de alta y sí su aviso", async () => {
    const html = await renderComo({}, "CONSULTA");

    expect(html).not.toContain("Nueva persona");
    expect(html).toContain("Su rol no permite");
  });
});
