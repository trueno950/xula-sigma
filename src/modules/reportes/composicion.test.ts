import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeReportes } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `territorio/composicion.test.ts`
 * y `constancias/composicion.test.ts`: alcanza con la parte de la cadena de
 * Drizzle que `leer` realmente usa, y corre sin Postgres.
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

/**
 * La primera columna que cada conjunto tiene que listar. `folios_de_reportes`
 * no lleva `id` -su identidad es la pareja municipio/anio- y `anio` es la
 * columna con la que se sigue la numeracion que el archivo tiene que
 * conservar.
 */
const PRIMERA_COLUMNA: Record<string, string> = {
  reportes: "id",
  movimientos_de_reportes: "id",
  folios_de_reportes: "anio",
};

const primeraColumna = (nombre: string) => {
  const columna = PRIMERA_COLUMNA[nombre];

  if (!columna) throw new Error(`Falta la primera columna de "${nombre}".`);

  return columna;
};

const porcionLlamada = (nombre: string) => {
  const porcion = porcionesDeReportes.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`Falta la porcion "${nombre}".`);

  return porcion;
};

describe("porcionesDeReportes", () => {
  it("declara las tres porciones con nombres distintos entre si y de los otros modulos", () => {
    const nombres = porcionesDeReportes.map((porcion) => porcion.nombre);

    expect(nombres).toEqual([
      "reportes",
      "movimientos_de_reportes",
      "folios_de_reportes",
    ]);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const conocido of [
      "usuarios",
      "bitacora",
      "personas",
      "lugares",
      "calles",
      "domicilios",
      "residencias",
      "zonas",
      "calles_de_zonas",
      "eventos_de_calles",
      "constancias",
      "reimpresiones",
      "folios_de_documentos",
      "configuracion_de_documentos",
      "intervenciones",
      "revisiones_de_intervenciones",
    ]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeReportes) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          [primeraColumna(porcion.nombre)]: expect.anything(),
        }),
      );
    }
  });

  it("reportes incluye descripcion y referencia: el archivo municipal reconstruye que se reporto", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("reportes").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: expect.anything(),
        referencia: expect.anything(),
      }),
    );
  });

  it("folios_de_reportes exporta ultimoConsecutivo: quien reciba los datos sigue la numeracion sin repetirla", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("folios_de_reportes").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ ultimoConsecutivo: expect.anything() }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeReportes) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
