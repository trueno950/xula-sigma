import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  ejecutarPsqlFallido,
  RUTA_DE_BUSQUEDA_ANTERIOR,
} from "./baseAnteriorAlCorteDePrueba";
import {
  cerrarBaseAnterior,
  crearLugarAnterior,
  prepararBaseAnterior,
} from "./conexionAnteriorAlCorteDePrueba";

/**
 * Las dos mitades del corte que no se pueden probar desde TypeScript.
 *
 * Los tipos y los fixtures prueban que el codigo ya no nombra `sector` ni
 * `manzana`; esto prueba lo otro: que **Postgres** los rechaza (si no, un
 * `INSERT` de otro cliente o de un script viejo volveria a meterlos) y que
 * el CHECK de `drizzle/0020` **aborta** si la base todavia tiene filas de
 * esos dos tipos. Lo segundo es la precondicion operativa de B3d: sin la
 * migracion de datos corrida antes, el `ALTER TABLE` falla y la migracion
 * entera se revierte.
 */
const databaseUrl = () => {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("Falta DATABASE_URL.");
  return valor;
};

const databaseUrlDelOwner = () => {
  const valor = process.env.MIGRATION_DATABASE_URL;
  if (!valor) throw new Error("Falta MIGRATION_DATABASE_URL.");
  return valor;
};

const SQL_DEL_CORTE = readFileSync(
  "drizzle/0020_corte_tipos_lugar.sql",
  "utf8",
);

const insertarTipoSinCatalogo = (tipo: string) =>
  withTenant(motul, (tx) =>
    tx.execute(sql`
      INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
      VALUES (${motul}, ${tipo}, ${`Lugar ${tipo}`})
    `),
  );

const intentarCorte = () =>
  ejecutarPsqlFallido({
    databaseUrl: databaseUrlDelOwner(),
    entrada: [
      `SET search_path TO ${RUTA_DE_BUSQUEDA_ANTERIOR};`,
      "BEGIN;",
      SQL_DEL_CORTE,
      "COMMIT;",
    ].join("\n"),
  });

const intentarTipoInvalido = () =>
  ejecutarPsqlFallido({
    databaseUrl: databaseUrl(),
    entrada: [
      `SET search_path TO ${RUTA_DE_BUSQUEDA_ANTERIOR};`,
      "BEGIN;",
      `SELECT set_config('app.tenant', '${motul}', true);`,
      "INSERT INTO lugares (ayuntamiento_id, tipo, nombre)",
      `VALUES ('${motul}', 'inventado', 'Tipo que ninguna reja admite');`,
    ].join("\n"),
  });

beforeAll(async () => {
  await sembrar();
  await prepararBaseAnterior();
});

afterAll(async () => {
  await limpiar();
  await cerrarBaseAnterior();
});

describe("el corte de tipos en Postgres", () => {
  for (const tipo of ["sector", "manzana"]) {
    it(`rechaza ${tipo} contra el CHECK vigente`, async () => {
      const motivo = await motivoDeFalla(() => insertarTipoSinCatalogo(tipo));

      expect(motivo).toMatch(/lugares_tipo_valido/i);
    });
  }

  it("sigue aceptando los tres tipos del catalogo", async () => {
    for (const tipo of ["cabecera", "comisaria", "colonia"]) {
      await insertarTipoSinCatalogo(tipo);
    }

    const [fila] = await withTenant(motul, (tx) =>
      tx.execute<{ total: string }>(sql`
        SELECT count(*)::text AS total FROM lugares
         WHERE ayuntamiento_id = ${motul}
           AND tipo IN ('cabecera', 'comisaria', 'colonia')
      `),
    );

    expect(Number(fila?.total)).toBe(3);
  });

  /**
   * El `DROP` y el `ADD` van en la misma transaccion: si el `ADD` falla,
   * revierte el `DROP` y el esquema anterior queda como estaba. Es la
   * unica forma de provocar el fallo sin dejar a medio migrar lo que
   * despues usan los otros tests de B3d.
   */
  it("aborta el CHECK del corte si la base todavia tiene un sector", async () => {
    const asentamientoId = await crearLugarAnterior({
      ayuntamientoId: motul,
      tipo: "comisaria",
      nombre: "Comisaria con sector vivo",
    });
    await crearLugarAnterior({
      ayuntamientoId: motul,
      tipo: "sector",
      nombre: "Sector que B3d tiene que migrar",
      padreId: asentamientoId,
    });

    const salida = intentarCorte();

    // Postgres nombra la restriccion y la tabla, no el valor culpable: la
    // fila que la viola se busca con `scripts/auditar-raices.sql` o con el
    // reporte de B3d, no en este mensaje.
    expect(salida).toContain("lugares_tipo_valido");
    expect(salida).toMatch(/is violated by some row/);
    // El `DROP` revirtio con el `ADD`: la reja anterior sigue en pie.
    expect(intentarTipoInvalido()).toContain("lugares_tipo_valido");
  });
});
