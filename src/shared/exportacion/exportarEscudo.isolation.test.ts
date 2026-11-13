import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { ayuntamientos, bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { exportarAyuntamiento } from "./exportar";

/**
 * El escudo y la traza de la exportacion (S1): la lectura ocurre adentro de
 * la transaccion que registra `EXPORTAR_AYUNTAMIENTO`, asi que un fallo del
 * almacenamiento no deja al municipio registrado como exportado sin haber
 * recibido su archivo.
 *
 * Archivo aparte de `exportarMarca.isolation.test.ts` y de
 * `exportar.isolation.test.ts` por la misma razon que ese explica: cada uno
 * tiene que entrar en las 200 lineas por archivo de `AGENTS.md`, y la traza
 * es una preocupacion distinta de la marca.
 */

let gente: GentePorMunicipio;

const ESCUDO = new TextEncoder().encode("escudo-de-prueba");
const URL_DEL_ESCUDO = "https://assets.prueba.local/motul/escudo-x.png";

const actor = (municipio: "motul" | "ticul") =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const marcaDe = (municipio: typeof motul, marca: Record<string, unknown>) =>
  withTenant(municipio, (tx) =>
    tx
      .update(ayuntamientos)
      .set({ marca })
      .where(eq(ayuntamientos.id, municipio)),
  );

const trazasDeExportacion = (municipio: typeof motul) =>
  withTenant(municipio, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "EXPORTAR_AYUNTAMIENTO")),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("exportarAyuntamiento: escudo y traza", () => {
  it("un escudo que no se puede leer no deja traza", async () => {
    await marcaDe(motul, { escudo: URL_DEL_ESCUDO });
    const lector = {
      leer: vi.fn().mockRejectedValue(new Error("R2 no respondio")),
    };
    const antes = await trazasDeExportacion(motul);

    await expect(
      exportarAyuntamiento(actor("motul"), [], lector),
    ).rejects.toThrow(/R2/);

    // Se afirma el delta y no el total: los otros tests de este archivo y de
    // los de al lado tambien exportan. Ademas el delta es la afirmacion real
    // —sin ZIP no hay traza— y el total no lo es.
    const despues = await trazasDeExportacion(motul);

    expect(lector.leer).toHaveBeenCalledWith(motul, URL_DEL_ESCUDO);
    expect(despues).toHaveLength(antes.length);
  });

  it("el escudo leido viaja en la exportacion y deja una sola traza", async () => {
    await marcaDe(motul, { escudo: URL_DEL_ESCUDO });
    const lector = { leer: vi.fn().mockResolvedValue(ESCUDO) };
    const antes = await trazasDeExportacion(motul);

    const exportacion = await exportarAyuntamiento(actor("motul"), [], lector);
    const despues = await trazasDeExportacion(motul);

    expect(exportacion.escudo).toEqual(ESCUDO);
    expect(lector.leer).toHaveBeenCalledWith(motul, URL_DEL_ESCUDO);
    expect(despues).toHaveLength(antes.length + 1);
  });

  it("sin escudo configurado no consulta el almacenamiento y deja su traza", async () => {
    await marcaDe(ticul, {});
    const lector = { leer: vi.fn().mockResolvedValue(ESCUDO) };
    const antes = await trazasDeExportacion(ticul);

    const exportacion = await exportarAyuntamiento(actor("ticul"), [], lector);
    const despues = await trazasDeExportacion(ticul);

    expect(exportacion.escudo).toBeUndefined();
    expect(lector.leer).not.toHaveBeenCalled();
    expect(despues).toHaveLength(antes.length + 1);
  });

  it("sin lector la exportacion sale sin escudo y con su traza", async () => {
    await marcaDe(motul, { escudo: URL_DEL_ESCUDO });
    const antes = await trazasDeExportacion(motul);

    const exportacion = await exportarAyuntamiento(actor("motul"), []);
    const despues = await trazasDeExportacion(motul);

    expect(exportacion.escudo).toBeUndefined();
    expect(despues).toHaveLength(antes.length + 1);
  });
});
