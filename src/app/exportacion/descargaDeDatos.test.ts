import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportacionConEscudo } from "@/shared/exportacion/exportar";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";

/**
 * La composicion de la descarga: exportar —el escudo se lee alla adentro— y
 * armar el ZIP (S1, S4). La base va mockeada; lo que se prueba es que el
 * escudo que trae la exportacion sea el que viaja en el ZIP, y que quien
 * recibe el lector del modulo de marca sea `exportarAyuntamiento` y no este
 * archivo.
 */

const exportarMock = vi.hoisted(() => vi.fn());
const leerMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/exportacion/exportar", () => ({
  exportarAyuntamiento: exportarMock,
}));
vi.mock("@/modules/marca/composicion", () => ({
  lectorDeEscudo: { leer: leerMock },
}));

const { descargaDeDatos } = await import("./descargaDeDatos");

const ESCUDO = new TextEncoder().encode("escudo-de-prueba");
const URL_DEL_ESCUDO = "https://assets.example.com/motul/escudo-x.png";

const contexto = {
  ayuntamientoId: comoAyuntamientoId(randomUUID()),
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "https://motul.xulasigma.mx",
};

const exportacionDe = (
  marca: ExportacionConEscudo["ayuntamiento"]["marca"],
  escudo?: Uint8Array,
): ExportacionConEscudo => ({
  generadaEn: new Date("2026-11-13T23:05:00.000Z"),
  ayuntamiento: {
    id: contexto.ayuntamientoId,
    subdominio: "motul",
    nombre: "Motul",
    marca,
  },
  conjuntos: { usuarios: [{ id: "1", email: "admin@motul.example.com" }] },
  escudo,
});

const comoTexto = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

describe("descargaDeDatos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    leerMock.mockResolvedValue(ESCUDO);
  });

  it("el escudo que trae la exportacion viaja dentro del ZIP", async () => {
    exportarMock.mockResolvedValue(
      exportacionDe({ escudo: URL_DEL_ESCUDO }, ESCUDO),
    );

    const { bytes } = await descargaDeDatos(contexto);

    expect(comoTexto(bytes)).toContain("escudo.png");
    expect(comoTexto(bytes)).toContain("escudo-de-prueba");
    // La lectura del escudo ya no ocurre aca: si este archivo la hiciera, el
    // ZIP se armaria con un escudo distinto del que la exportacion registro.
    expect(leerMock).not.toHaveBeenCalled();
  });

  it("sin escudo el ZIP sale sin el", async () => {
    exportarMock.mockResolvedValue(exportacionDe({}));

    const { bytes } = await descargaDeDatos(contexto);

    expect(comoTexto(bytes)).not.toContain("escudo.png");
  });

  it("la exportacion recibe el lector de escudos del modulo de marca", async () => {
    exportarMock.mockResolvedValue(exportacionDe({}));

    await descargaDeDatos(contexto);

    const [, , lector] = exportarMock.mock.calls[0] ?? [];

    expect(lector.leer).toBe(leerMock);
  });

  it("el ZIP lleva el CSV del conjunto y el manifiesto", async () => {
    exportarMock.mockResolvedValue(exportacionDe({}));

    const { bytes } = await descargaDeDatos(contexto);
    const texto = comoTexto(bytes);

    expect(texto).toContain("usuarios.csv");
    expect(texto).toContain("manifiesto.json");
    expect(texto).toContain("admin@motul.example.com");
  });

  it("un fallo de la base aborta la descarga", async () => {
    exportarMock.mockRejectedValue(new Error("la base no respondio"));

    await expect(descargaDeDatos(contexto)).rejects.toThrow(/base/);
    expect(leerMock).not.toHaveBeenCalled();
  });

  it("nombra el archivo con el subdominio y la fecha civil de Merida", async () => {
    exportarMock.mockResolvedValue({
      ...exportacionDe({}),
      generadaEn: new Date("2026-11-14T02:00:00.000Z"),
    });

    const { nombre } = await descargaDeDatos(contexto);

    expect(nombre).toBe("motul-2026-11-13.zip");
  });
});
