/**
 * Siembra un municipio de prueba para navegar la app en desarrollo.
 *
 *   pnpm seed:dev
 *
 * Usa los mismos caminos que produccion — `withAltaDeAyuntamiento` y
 * `altaDePersona` — y no SQL a mano: si el alta real se rompe, este script
 * se rompe con el, en vez de sembrar datos que el codigo real ya no podria
 * crear.
 *
 * Idempotente: si el subdominio ya existe, `ayuntamientos_subdominio_unique`
 * lo rechaza y el script lo informa en vez de fallar ruidoso.
 */

import { altaDePersona } from "../src/shared/auth/alta";
import {
  cerrarProvision,
  withAltaDeAyuntamiento,
} from "../src/shared/tenancy/provision";

const SUBDOMINIO = "demo";
const NOMBRE_MUNICIPIO = "Municipio Demo";
const EMAIL_ADMIN = "admin@demo.example.com";

/**
 * Igual que `bootstrap.sql` toma sus claves por `-v` en vez de traerlas
 * escritas: por defecto siembra con una clave de desarrollo explicita,
 * pero `SEED_ADMIN_CLAVE` la reemplaza sin tocar el script.
 */
const CLAVE_ADMIN =
  process.env.SEED_ADMIN_CLAVE ?? "clave-de-desarrollo-no-usar-en-produccion";

const mensajeDeExito = () => `
Municipio de prueba listo.

  URL:     http://${SUBDOMINIO}.localhost:3000
  Email:   ${EMAIL_ADMIN}
  Clave:   ${CLAVE_ADMIN}
`;

type ErrorConCausa = { message: string; cause?: { message?: string } };

const esErrorConCausa = (error: unknown): error is ErrorConCausa =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof (error as { message: unknown }).message === "string";

/** Mismo desenvolvimiento del error de Drizzle que `motivoDeFalla` en `municipiosDePrueba.ts`. */
const esSubdominioDuplicado = (error: unknown): boolean => {
  if (!esErrorConCausa(error)) return false;

  const mensaje = error.cause?.message ?? error.message;

  return mensaje.includes("ayuntamientos_subdominio_unique");
};

async function main() {
  try {
    await withAltaDeAyuntamiento(
      { subdominio: SUBDOMINIO, nombre: NOMBRE_MUNICIPIO },
      (tx, ayuntamientoId) =>
        altaDePersona(tx, ayuntamientoId, {
          nombre: "Admin Demo",
          email: EMAIL_ADMIN,
          clave: CLAVE_ADMIN,
          rol: "ADMIN_MUNICIPAL",
        }),
    );
  } catch (error) {
    await cerrarProvision();

    if (esSubdominioDuplicado(error)) {
      // biome-ignore lint/suspicious/noConsole: script de CLI, la salida es el producto
      console.log(`Ya existe "${SUBDOMINIO}". Nada que sembrar.`);
      return;
    }

    throw error;
  }

  // biome-ignore lint/suspicious/noConsole: script de CLI, la salida es el producto
  console.log(mensajeDeExito());
  await cerrarProvision();
}

main();
