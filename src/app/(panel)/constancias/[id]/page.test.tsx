import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const constanciaPorIdMock = vi.hoisted(() => vi.fn());
const exigirAyuntamientoMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: exigirAyuntamientoMock,
}));
vi.mock("@/modules/constancias/ui/actions/reimprimirConstanciaAction", () => ({
  reimprimirConstanciaAction: "reimprimir-action",
}));
vi.mock("@/modules/constancias/ui/actions/cancelarConstanciaAction", () => ({
  cancelarConstanciaAction: "cancelar-action",
}));
vi.mock("@/modules/constancias", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/constancias")>()),
  comoConstanciaId: (id: string) => id,
  constanciaPorId: constanciaPorIdMock,
  esquemaDeSnapshot: { parse: (dato: unknown) => dato },
}));

const { default: PaginaDeDetalleDeConstancia } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";
const PERSONA = "22222222-2222-4222-8222-222222222222";

const vigente = {
  id: ID,
  folio: "VEC-2026-000001",
  personaId: PERSONA,
  emitidaEn: new Date("2026-01-01T18:00:00Z"),
  estado: "VIGENTE",
  canceladaEn: null,
  motivoCancelacion: null,
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: { texto: "Calle 20 #10", desdeEn: "2024-01-01" },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
};

const cancelada = {
  ...vigente,
  estado: "CANCELADA",
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
  exigirAyuntamientoMock.mockResolvedValue({
    id: "motul",
    nombre: "Motul",
    subdominio: "motul",
    marca: {},
  });
});

describe("detalle de una constancia", () => {
  it("una constancia vigente ofrece Imprimir", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    expect(await html()).toContain("Imprimir");
  });

  it("muestra la fecha civil de residencia en formato corto", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    const pagina = await html();

    expect(pagina).toContain("1 ene 2024");
    expect(pagina).not.toContain("2024-01-01");
  });

  /** La cabecera dice que es el documento; el folio es el titulo. */
  it("titula con el folio y subtitula con el tipo de documento", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    const pagina = await html();

    expect(pagina).toMatch(/<h1[^>]*>VEC-2026-000001<\/h1>/);
    expect(pagina).toContain("Constancia de vecindad");
  });

  /**
   * S7 con la decision L6: el estado se lee una sola vez, como el sello
   * sobre la hoja. Una insignia en la cabecera lo repetiria.
   */
  it("sella el estado una sola vez, sobre la hoja", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    expect((await html()).match(/Vigente/g)).toHaveLength(1);
  });

  /** S8: desde la propia hoja se llega a la ficha del titular. */
  it("el titular de la hoja enlaza a su ficha en el padron", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    expect(await html()).toContain(`href="/padron/${PERSONA}"`);
  });

  it("muestra el historial del documento con la emision", async () => {
    constanciaPorIdMock.mockResolvedValue(vigente);

    const pagina = await html();

    expect(pagina).toContain("Historial del documento");
    expect(pagina).toContain("Constancia emitida");
  });

  it("una constancia cancelada lleva el sello con la fecha y el motivo, y sigue mostrando el registro", async () => {
    constanciaPorIdMock.mockResolvedValue(cancelada);

    const pagina = await html();

    expect(pagina).toContain("Cancelada");
    expect(pagina).toContain("1 feb 2026");
    expect(pagina).toContain("Motivo: Error de captura");
    expect(pagina).not.toContain("ERROR_DE_CAPTURA");
    expect(pagina).toContain("Juan Poot");
    expect(pagina).toContain("VEC-2026-000001");
  });

  /**
   * El lienzo elegido lo registra: una hoja cancelada no se imprime, porque
   * en manos de la persona se lee como prueba vigente. La ruta del PDF sigue
   * igual; lo que cambia es que la pantalla no ofrece el boton.
   */
  it("una constancia cancelada no ofrece Imprimir ni reimprimir y lleva a emitir otra", async () => {
    constanciaPorIdMock.mockResolvedValue(cancelada);

    const pagina = await html();

    expect(pagina).not.toContain(`href="/constancias/${ID}/pdf"`);
    expect(pagina).not.toContain("Reimprimir constancia…");
    expect(pagina).not.toContain("Cancelar constancia…");
    expect(pagina).toContain(`href="/constancias/emitir?personaId=${PERSONA}"`);
  });
});
