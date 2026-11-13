import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeTerritorio } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `padron/composicion.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que `leer` realmente usa, y
 * corre sin Postgres.
 *
 * Prueba design.md decision 9; el porque de cada aserto -columnas
 * explicitas, `personaId` crudo- esta en el comentario de
 * `porcionesDeTerritorio` en `composicionDeExportacion.ts`, no aca.
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

/**
 * La primera columna que cada conjunto tiene que listar. `calles_de_zonas`
 * no lleva `id` -su identidad es la pareja zona/calle-, asi que el mapa
 * evita que herede el aserto de una tabla que si lo tiene.
 */
const PRIMERA_COLUMNA: Record<string, string> = {
  lugares: "id",
  calles: "id",
  domicilios: "id",
  residencias: "id",
  zonas: "id",
  calles_de_zonas: "zonaId",
  eventos_de_calles: "id",
};

const primeraColumna = (nombre: string) => {
  const columna = PRIMERA_COLUMNA[nombre];

  if (!columna) throw new Error(`Falta la primera columna de "${nombre}".`);

  return columna;
};

const porcionLlamada = (nombre: string) => {
  const porcion = porcionesDeTerritorio.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`Falta la porcion "${nombre}".`);

  return porcion;
};

describe("porcionesDeTerritorio", () => {
  it("declara las siete porciones con nombres distintos entre si y de los de la plataforma", () => {
    const nombres = porcionesDeTerritorio.map((porcion) => porcion.nombre);

    expect(nombres).toEqual([
      "lugares",
      "calles",
      "domicilios",
      "residencias",
      "zonas",
      "calles_de_zonas",
      "eventos_de_calles",
    ]);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const conocido of ["usuarios", "bitacora", "personas"]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeTerritorio) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          [primeraColumna(porcion.nombre)]: expect.anything(),
        }),
      );
    }
  });

  it("residencias exporta personaId crudo: el historial tiene que poder leerse", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("residencias").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ personaId: expect.anything() }),
    );
  });

  it("domicilios exporta bajaEn, igual que lugares y calles", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("domicilios").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ bajaEn: expect.anything() }),
    );
  });

  it("eventos_de_calles exporta el antes y el despues: el punto anterior no existe en otra fila", async () => {
    const { tx, select } = txDePrueba();

    await porcionLlamada("eventos_de_calles").leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        latitudAnterior: expect.anything(),
        latitudNueva: expect.anything(),
        lugarAnteriorId: expect.anything(),
        lugarNuevoId: expect.anything(),
      }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeTerritorio) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
