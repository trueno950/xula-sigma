import { defineConfig } from "drizzle-kit";

/**
 * Las migraciones corren con el rol owner, nunca con el de aplicacion.
 * El rol de aplicacion no puede crear tablas y ese es el punto: si esta
 * URL apuntara al rol de la app, las tablas nuevas quedarian con el
 * owner equivocado y RLS dejaria de aplicarse sobre ellas.
 *
 * Ver ADR 0001 seccion 2.
 */
const url = process.env.MIGRATION_DATABASE_URL;

if (!url) {
  throw new Error(
    "Falta MIGRATION_DATABASE_URL. Es la conexion del rol owner, distinta " +
      "de DATABASE_URL. Ver .env.example.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  // Glob: cada modulo aporta su propio esquema conforme se construye.
  schema: ["./src/shared/**/esquema.ts", "./src/modules/**/esquema.ts"],
  out: "./drizzle",
  dbCredentials: { url },
  // Identificadores en snake_case en la base, camelCase en TypeScript.
  casing: "snake_case",
  strict: true,
  verbose: true,
});
