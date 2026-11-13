import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeConstancias } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `padron/composicion.test.ts` y
 * `territorio/composicion.test.ts`: alcanza con la parte de la cadena de
 * Drizzle que `leer` realmente usa, y corre sin Postgres.
 *
 * Prueba design.md seccion 8: el archivo municipal reconstruye el documento
 * -por eso `codigoVerificacion` viaja- pero el jsonb `datos` completo no
 * sale sin una decision explicita de que columnas de el exportar, y esta
 * rebanada no la toma (design.md, pregunta abierta de la seccion 20).
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

/**
 * La primera columna que cada conjunto tiene que listar. Sin `ayuntamientoId`
 * -el mapa lo excluye a proposito- y sin `id` en los tres que no lo llevan:
 * su identidad es la llave completa de la fila.
 */
const PRIMERA_COLUMNA: Record<string, string> = {
  constancias: "id",
  reimpresiones: "id",
  configuracion_de_documentos: "datos",
  folios_de_documentos: "tipo",
};

const primeraColumna = (nombre: string) => {
  const columna = PRIMERA_COLUMNA[nombre];

  if (!columna) throw new Error(`Falta la primera columna de "${nombre}".`);

  return columna;
};

const porcionLlamada = (nombre: string) => {
  const porcion = porcionesDeConstancias.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`Falta la porcion "${nombre}".`);

  return porcion;
};

describe("porcionesDeConstancias", () => {
  it("declara sus cuatro nombres distintos de la plataforma, padron y territorio", () => {
    const nombres = porcionesDeConstancias.map((porcion) => porcion.nombre);

    expect(nombres).toEqual([
      "constancias",
      "reimpresiones",
      "configuracion_de_documentos",
      "folios_de_documentos",
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
    ]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeConstancias) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          [primeraColumna(porcion.nombre)]: expect.anything(),
        }),
      );
    }
  });

  it("constancias incluye codigoVerificacion: el archivo municipal reconstruye el documento", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("constancias").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ codigoVerificacion: expect.anything() }),
    );
  });

  it("constancias no incluye el jsonb datos completo sin decision explicita de que columnas exportar", async () => {
    /**
     * Es sobre `constancias` y no sobre el arreglo entero:
     * `configuracion_de_documentos` **si** exporta su jsonb `datos`, porque
     * ahi `datos` es toda la fila -el bloque de firma- y no hay otra
     * columna que lo sustituya.
     */
    const { tx, select } = txDePrueba();

    await porcionLlamada("constancias").leer(tx);

    expect(select).not.toHaveBeenCalledWith(
      expect.objectContaining({ datos: expect.anything() }),
    );
  });

  it("reimpresiones exporta motivo y ocurridoEn: el historial de impresiones se lee fuera del sistema", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("reimpresiones").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        motivo: expect.anything(),
        ocurridoEn: expect.anything(),
      }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeConstancias) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
