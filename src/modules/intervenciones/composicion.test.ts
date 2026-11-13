import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeIntervenciones } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `territorio/composicion.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que `leer` realmente usa, y
 * corre sin Postgres.
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

/**
 * La primera columna que cada conjunto tiene que listar. `revisiones` pide
 * `id` como las demas; el mapa existe para que un conjunto nuevo no herede
 * el aserto de otro.
 */
const PRIMERA_COLUMNA: Record<string, string> = {
  intervenciones: "id",
  revisiones_de_intervenciones: "id",
};

const primeraColumna = (nombre: string) => {
  const columna = PRIMERA_COLUMNA[nombre];

  if (!columna) throw new Error(`Falta la primera columna de "${nombre}".`);

  return columna;
};

const porcionLlamada = (nombre: string) => {
  const porcion = porcionesDeIntervenciones.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`Falta la porcion "${nombre}".`);

  return porcion;
};

describe("porcionesDeIntervenciones", () => {
  it("declara las dos porciones con nombres distintos entre si y de los otros modulos", () => {
    const nombres = porcionesDeIntervenciones.map((porcion) => porcion.nombre);

    expect(nombres).toEqual(["intervenciones", "revisiones_de_intervenciones"]);
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
      "reportes",
      "movimientos_de_reportes",
      "folios_de_reportes",
    ]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeIntervenciones) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          [primeraColumna(porcion.nombre)]: expect.anything(),
        }),
      );
    }
  });

  it("revisiones exporta los valores anteriores: es la unica copia del antes", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("revisiones_de_intervenciones").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ valoresAnteriores: expect.anything() }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeIntervenciones) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
