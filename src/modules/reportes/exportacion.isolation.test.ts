import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeReportes } from "./composicion";
import { foliosDeReportes } from "./infrastructure/esquema";

/**
 * La porcion `folios_de_reportes`: el contador que deja a quien reciba los
 * datos seguir la numeracion sin repetirla (S2 de
 * `odd/tasks/exportacion-de-datos.md`).
 *
 * Los dos municipios llevan la MISMA llave `(anio)`: si el filtro de tenant
 * no existiera, la lectura devolveria dos filas con el mismo `anio` y la
 * igualdad exacta fallaria.
 */

const porcionLLamada = (nombre: string) => {
  const porcion = porcionesDeReportes.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`La exportacion no declara "${nombre}".`);

  return porcion;
};

const consecutivosDe = async (
  ayuntamientoId: AyuntamientoId,
): Promise<readonly unknown[]> => {
  const filas = await withTenant(ayuntamientoId, (tx) =>
    porcionLLamada("folios_de_reportes").leer(tx),
  );

  return filas.map(
    (fila) => (fila as Record<string, unknown>).ultimoConsecutivo,
  );
};

beforeAll(async () => {
  await sembrar();
  await withTenant(motul, (tx) =>
    tx
      .insert(foliosDeReportes)
      .values({ ayuntamientoId: motul, anio: 2026, ultimoConsecutivo: 3 }),
  );
  await withTenant(ticul, (tx) =>
    tx
      .insert(foliosDeReportes)
      .values({ ayuntamientoId: ticul, anio: 2026, ultimoConsecutivo: 5 }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("porcion de exportacion de folios de reportes", () => {
  it("solo trae el contador del municipio activo", async () => {
    expect(await consecutivosDe(motul)).toEqual([3]);
    expect(await consecutivosDe(ticul)).toEqual([5]);
  });
});
