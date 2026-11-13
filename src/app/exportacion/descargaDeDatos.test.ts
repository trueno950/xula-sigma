import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Exportacion } from "@/shared/exportacion/exportar";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";

/**
 * La composicion de la descarga: exportar, leer el escudo del almacen y
 * armar el ZIP (S4). Los dos puertos que decide la peticion —la base y el
 * almacenamiento de objetos— van mockeados; lo que se prueba es el orden y
 * lo que pasa cuando uno de los dos falla, porque de eso depende que el
 * municipio nunca reciba un archivo que parece completo y no lo esta.
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

const contexto = {
  ayuntamientoId: comoAyuntamientoId(randomUUID()),
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "https://motul.xulasigma.mx",
};

const exportacionDe = (
  marca: Exportacion["ayuntamiento"]["marca"],
  generadaEn = new Date("2026-11-13T23:05:00.000Z"),
): Exportacion => ({
  generadaEn,
  ayuntamiento: {
    id: contexto.ayuntamientoId,
    subdominio: "motul",
    nombre: "Motul",
    marca,
  },
  conjuntos: { usuarios: [{ id: "1", email: "admin@motul.example.com" }] },
});

const comoTexto = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

describe("descargaDeDatos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    leerMock.mockResolvedValue(ESCUDO);
  });

  it("el escudo se lee del almacen y viaja dentro del ZIP", async () => {
    const escudo = "https://assets.example.com/motul/escudo-x.png";
    exportarMock.mockResolvedValue(exportacionDe({ escudo }));

    const { bytes } = await descargaDeDatos(contexto);

    expect(leerMock).toHaveBeenCalledWith(contexto.ayuntamientoId, escudo);
    expect(comoTexto(bytes)).toContain("escudo.png");
    expect(comoTexto(bytes)).toContain("escudo-de-prueba");
  });

  it("el ZIP lleva el CSV del conjunto y el manifiesto", async () => {
    exportarMock.mockResolvedValue(exportacionDe({}));

    const { bytes } = await descargaDeDatos(contexto);
    const texto = comoTexto(bytes);

    expect(texto).toContain("usuarios.csv");
    expect(texto).toContain("manifiesto.json");
    expect(texto).toContain("admin@motul.example.com");
  });

  it("sin escudo el ZIP sale sin el, y no consulta el almacenamiento", async () => {
    exportarMock.mockResolvedValue(exportacionDe({}));

    const { bytes } = await descargaDeDatos(contexto);

    expect(leerMock).not.toHaveBeenCalled();
    expect(comoTexto(bytes)).not.toContain("escudo.png");
  });

  it("un fallo del almacenamiento aborta la descarga en vez de entregar un ZIP sin escudo", async () => {
    exportarMock.mockResolvedValue(
      exportacionDe({ escudo: "https://assets.example.com/motul/x.png" }),
    );
    leerMock.mockRejectedValue(new Error("R2 no respondio"));

    await expect(descargaDeDatos(contexto)).rejects.toThrow(/R2/);
  });

  /**
   * La lectura del escudo ocurre despues de que `exportarAyuntamiento`
   * devuelve, o sea con la transaccion ya cerrada: si la base falla no hay
   * nada que leer en el almacenamiento, y sostener una transaccion abierta
   * mientras se habla con R2 ataria una conexion del pool a un servicio
   * externo.
   */
  it("si la lectura de la base falla no toca el almacenamiento", async () => {
    exportarMock.mockRejectedValue(new Error("la base no respondio"));

    await expect(descargaDeDatos(contexto)).rejects.toThrow(/base/);
    expect(leerMock).not.toHaveBeenCalled();
  });

  it("nombra el archivo con el subdominio y la fecha civil de Merida", async () => {
    exportarMock.mockResolvedValue(
      exportacionDe({}, new Date("2026-11-14T02:00:00.000Z")),
    );

    const { nombre } = await descargaDeDatos(contexto);

    expect(nombre).toBe("motul-2026-11-13.zip");
  });
});
