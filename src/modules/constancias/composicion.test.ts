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

describe("porcionesDeConstancias", () => {
  it("declara su nombre distinto de la plataforma, padron y territorio", () => {
    const nombres = porcionesDeConstancias.map((porcion) => porcion.nombre);

    expect(nombres).toEqual(["constancias"]);
    for (const conocido of [
      "usuarios",
      "bitacora",
      "personas",
      "lugares",
      "calles",
      "domicilios",
      "residencias",
    ]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("lee columnas explicitas, nunca select() pelado", async () => {
    const porcion = porcionesDeConstancias[0];
    const { tx, select } = txDePrueba();

    await porcion.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
    );
  });

  it("incluye codigoVerificacion: el archivo municipal reconstruye el documento", async () => {
    const porcion = porcionesDeConstancias[0];
    const { tx, select } = txDePrueba();

    await porcion.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ codigoVerificacion: expect.anything() }),
    );
  });

  it("no incluye el jsonb datos completo sin decision explicita de que columnas exportar", async () => {
    const porcion = porcionesDeConstancias[0];
    const { tx, select } = txDePrueba();

    await porcion.leer(tx);

    expect(select).not.toHaveBeenCalledWith(
      expect.objectContaining({ datos: expect.anything() }),
    );
  });

  it("no incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    const porcion = porcionesDeConstancias[0];
    const { tx, select } = txDePrueba();

    await porcion.leer(tx);

    expect(select).not.toHaveBeenCalledWith(
      expect.objectContaining({ ayuntamientoId: expect.anything() }),
    );
  });
});
