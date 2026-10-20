import { readFileSync } from "node:fs";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ejecutarPsql } from "./psqlAnteriorAlCorteDePrueba";

export {
  ejecutarPsql,
  ejecutarPsqlFallido,
} from "./psqlAnteriorAlCorteDePrueba";

/**
 * El esquema de `territorio` **anterior** al corte de `sector`/`manzana`,
 * montado en un esquema aparte para que los tests de la migracion B3d
 * sigan corriendo despues de la migracion 0020.
 *
 * Por que hace falta y por que no alcanza con el esquema vivo: B3d existe
 * para mover los domicilios que cuelgan de un `sector` o una `manzana`, y
 * el corte de tipos convierte esos dos valores en filas imposibles —el
 * CHECK `lugares_tipo_valido` de `drizzle/0020` las rechaza—. Un test que
 * necesite sembrarlas no puede correr sobre el esquema cortado, y aflojar
 * el CHECK para que pase seria borrar justamente lo que B2 garantiza.
 *
 * Tampoco alcanza con una base nueva: crear una base pide `CREATEDB`, que
 * ninguno de los tres roles del proyecto tiene (`scripts/bootstrap.sql`),
 * asi que el test no puede hacerlo en CI. Un **esquema** si: `xula_migrator`
 * tiene `CREATE` sobre la base, el mismo GRANT que necesita `drizzle-kit`.
 *
 * El esquema se arma replicando las migraciones 0000..0019 tal cual estan
 * en el repositorio, con un solo cambio de texto: las claves foraneas que
 * Drizzle emite calificadas (`"public"."ayuntamientos"`) se reescriben al
 * esquema propio, porque si no apuntarian fuera de el. No es una copia a
 * mano del esquema: es el mismo DDL, y por eso el `sector` de prueba lo
 * valida el CHECK de 0007, no un supuesto del test.
 *
 * Vive en un `*DePrueba.ts` por el mismo motivo que
 * `municipiosDePrueba.ts`: abre su propia conexion, y eso es lo que prueba.
 */
export const ESQUEMA_ANTERIOR = "legacy";

/**
 * `legacy` primero y `public` detras, y no `legacy` solo: las extensiones
 * (`pg_trgm`, `unaccent`) viven en `public` y `gin_trgm_ops` no se resuelve
 * sin el. Las tablas del esquema anterior existen con su nombre en `legacy`,
 * asi que ningun nombre cae del otro lado del `search_path`.
 */
export const RUTA_DE_BUSQUEDA_ANTERIOR = `${ESQUEMA_ANTERIOR}, public`;

/**
 * El catalogo de tipos anterior a 0020. **No es** `TipoDeLugar`: ese tipo
 * ya no los incluye, y por eso estos tests no pueden escribir sus fixtures
 * con el tipo del dominio. La lista es la que el CHECK de 0007 aceptaba.
 */
export const TIPOS_DE_LUGAR_ANTERIORES = [
  "cabecera",
  "comisaria",
  "colonia",
  "sector",
  "manzana",
] as const;

export type TipoDeLugarAnterior = (typeof TIPOS_DE_LUGAR_ANTERIORES)[number];

/** La ultima migracion que todavia admite `sector` y `manzana`. */
export const ULTIMA_MIGRACION_ANTERIOR = 19;

type EntradaDelJournal = { idx: number; tag: string };

const esEntradaDelJournal = (valor: unknown): valor is EntradaDelJournal =>
  typeof valor === "object" &&
  valor !== null &&
  typeof (valor as { idx?: unknown }).idx === "number" &&
  typeof (valor as { tag?: unknown }).tag === "string";

const migracionesAnteriores = (): string => {
  const journal: unknown = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const entradas =
    typeof journal === "object" &&
    journal !== null &&
    Array.isArray((journal as { entries?: unknown }).entries)
      ? (journal as { entries: unknown[] }).entries
      : [];

  return entradas
    .filter(esEntradaDelJournal)
    .filter(({ idx }) => idx <= ULTIMA_MIGRACION_ANTERIOR)
    .map(({ tag }) =>
      readFileSync(`drizzle/${tag}.sql`, "utf8").replaceAll(
        '"public".',
        `"${ESQUEMA_ANTERIOR}".`,
      ),
    )
    .join("\n");
};

const urlDe = (variable: "DATABASE_URL" | "MIGRATION_DATABASE_URL"): string => {
  const valor = process.env[variable];
  if (!valor) throw new Error(`Falta ${variable} para la base anterior.`);
  return valor;
};

/**
 * Rehace el esquema anterior desde cero. Idempotente: los tests lo llaman
 * en su `beforeAll` y no dependen de lo que dejo la corrida pasada.
 */
export const montarEsquemaAnterior = (): void => {
  ejecutarPsql({
    databaseUrl: urlDe("MIGRATION_DATABASE_URL"),
    entrada: [
      `DROP SCHEMA IF EXISTS ${ESQUEMA_ANTERIOR} CASCADE;`,
      `CREATE SCHEMA ${ESQUEMA_ANTERIOR};`,
      `SET search_path TO ${RUTA_DE_BUSQUEDA_ANTERIOR};`,
      migracionesAnteriores(),
      `GRANT USAGE ON SCHEMA ${ESQUEMA_ANTERIOR} TO xula_app;`,
      `GRANT USAGE ON SCHEMA ${ESQUEMA_ANTERIOR} TO xula_super_admin;`,
    ].join("\n"),
  });
};

export const limpiarEsquemaAnterior = (): void => {
  ejecutarPsql({
    databaseUrl: urlDe("MIGRATION_DATABASE_URL"),
    entrada: `DROP SCHEMA IF EXISTS ${ESQUEMA_ANTERIOR} CASCADE;`,
  });
};

/** Da de alta los municipios de prueba en el esquema anterior. */
export const sembrarMunicipiosAnteriores = (opciones: {
  motul: AyuntamientoId;
  ticul: AyuntamientoId;
  subdominioMotul: string;
  subdominioTicul: string;
}): void => {
  ejecutarPsql({
    databaseUrl: urlDe("MIGRATION_DATABASE_URL"),
    entrada: `SET search_path TO ${RUTA_DE_BUSQUEDA_ANTERIOR};
      INSERT INTO ayuntamientos (id, subdominio, nombre) VALUES
        ('${opciones.motul}', '${opciones.subdominioMotul}', 'Motul'),
        ('${opciones.ticul}', '${opciones.subdominioTicul}', 'Ticul');`,
  });
};
