import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";

const contextoActualMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());
const buscarTitularesMock = vi.hoisted(() => vi.fn());
const vistaPreviaMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/constancias/ui/actions/emitirConstanciaAction", () => ({
  emitirConstanciaAction: "emitir-action",
}));
vi.mock("@/modules/constancias", async () => {
  const { FormularioDeEmision } = await import(
    "@/modules/constancias/ui/FormularioDeEmision"
  );
  const { BuscadorDeTitular } = await import(
    "@/modules/constancias/ui/BuscadorDeTitular"
  );

  return {
    FormularioDeEmision,
    BuscadorDeTitular,
    buscarTitulares: buscarTitularesMock,
    vistaPreviaDeConstancia: vistaPreviaMock,
  };
});

const { default: PaginaDeEmisionDeConstancia } = await import("./page");

const PERSONA_ID = "22222222-2222-4222-8222-222222222222";

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "OPERADOR" as const },
  origen: "web" as const,
};

const VISTA = {
  clase: "vista" as const,
  vista: {
    municipio: "H. Ayuntamiento de Motul",
    titular: { nombreCompleto: "Guadalupe Kumul Poot" },
    direccion: {
      texto: "Calle 20 101, Colonia Centro, Motul",
      desdeEn: "2026-10-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
};

const pintar = async (
  searchParams: Record<string, string | string[] | undefined> = {},
) =>
  renderToStaticMarkup(
    await PaginaDeEmisionDeConstancia({
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  // `notFound()` de Next corta el render lanzando: sin eso el codigo que lo
  // llama seguiria con un `undefined` que nunca pasa en produccion.
  notFoundMock.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  contextoActualMock.mockResolvedValue(contexto);
  buscarTitularesMock.mockResolvedValue({ titulares: [], hayMas: false });
  vistaPreviaMock.mockResolvedValue(VISTA);
});

/**
 * S4: sin `?personaId=` la pantalla ofrece buscar a la persona ahi mismo.
 * Antes solo decia «Ir al padron», que es un callejon.
 */
describe("PaginaDeEmisionDeConstancia sin persona", () => {
  it("ofrece el buscador de persona y conserva la salida al padron", async () => {
    const html = await pintar();

    expect(html).toMatch(/<h1[^>]*>Emitir constancia<\/h1>/);
    expect(html).toContain(">Buscar persona<");
    expect(html).toContain('method="get"');
    expect(html).toContain('href="/padron"');
    expect((html.match(/<main/g) ?? []).length).toBe(1);
  });

  it("con `?q=` lista a quien encontro y enlaza a su emision", async () => {
    buscarTitularesMock.mockResolvedValue({
      titulares: [
        {
          id: "persona-1",
          nombreCompleto: "Guadalupe Kumul Poot",
          curp: null,
        },
      ],
      hayMas: false,
    });

    const html = await pintar({ q: "gpe" });

    expect(buscarTitularesMock).toHaveBeenCalledWith("gpe", contexto);
    expect(html).toContain('href="/constancias/emitir?personaId=persona-1"');
  });

  it("con `?q=` vacio no busca y no se cae", async () => {
    const html = await pintar({ q: "  " });

    expect(buscarTitularesMock).not.toHaveBeenCalled();
    expect(html).toContain(">Buscar persona<");
  });

  /** `?q=a&q=b` llega como arreglo: no puede tumbar el render con un 500. */
  it("un `?q=` repetido no rompe la pantalla", async () => {
    const html = await pintar({ q: ["a", "b"] });

    expect(buscarTitularesMock).not.toHaveBeenCalled();
    expect(html).toContain(">Buscar persona<");
  });
});

describe("PaginaDeEmisionDeConstancia con persona", () => {
  it("muestra la hoja de la constancia y el formulario de emision", async () => {
    const html = await pintar({ personaId: PERSONA_ID });

    expect(vistaPreviaMock).toHaveBeenCalledWith(PERSONA_ID, contexto);
    expect(html).toContain("Quien suscribe hace constar que");
    expect(html).toContain('action="emitir-action"');
    expect(html).toContain("Guadalupe Kumul Poot");
  });

  /** La migaja nombra a la persona y vuelve a su ficha del padron. */
  it("la migaja lleva a la ficha del titular", async () => {
    const html = await pintar({ personaId: PERSONA_ID });

    expect(html).toContain(`href="/padron/${PERSONA_ID}"`);
  });

  /** Sin bloque de firma se avisa antes de confirmar y se lleva a configurarlo. */
  it("sin bloque de firma avisa y lleva a configurarlo", async () => {
    contextoActualMock.mockResolvedValue({
      ...contexto,
      usuario: { id: "usuario-3", rol: "ADMIN_MUNICIPAL" as const },
    });
    vistaPreviaMock.mockResolvedValue({
      ...VISTA,
      vista: { ...VISTA.vista, firmante: null },
    });

    const html = await pintar({ personaId: PERSONA_ID });

    expect(html).toContain(
      "El ayuntamiento todavía no configuró el bloque de firma.",
    );
    expect(html).toContain('href="/constancias/configuracion"');
    expect(html).toContain("Configurar el bloque de firma");
    expect(html).not.toContain('action="emitir-action"');
  });

  it("con un rol sin administracion no ofrece configurar el bloque de firma", async () => {
    contextoActualMock.mockResolvedValue({
      ...contexto,
      usuario: { id: "usuario-2", rol: "CONSULTA" as const },
    });

    const html = await pintar({ personaId: PERSONA_ID });

    expect(html).toContain("Su rol no tiene permiso para emitir constancias.");
    expect(html).not.toContain('action="emitir-action"');
  });

  /** Regla 8: una persona de otro municipio no existe en esta pantalla. */
  it("un titular inexistente responde 404", async () => {
    vistaPreviaMock.mockRejectedValue(new NoEncontradoError());

    await expect(pintar({ personaId: PERSONA_ID })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(notFoundMock).toHaveBeenCalled();
  });

  /** S4: quien esta de baja no se puede emitir, ni siquiera por URL vieja. */
  it("un titular dado de baja explica el bloqueo y ofrece el buscador", async () => {
    vistaPreviaMock.mockResolvedValue({ clase: "titular-dado-de-baja" });

    const html = await pintar({ personaId: PERSONA_ID });

    expect(html).toContain(
      "Esta persona está dada de baja en el padrón: no se puede emitir su constancia.",
    );
    expect(html).toContain('href="/constancias/emitir"');
  });
});
