import postgres from "postgres";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { CLAVE, CORREO, MUNICIPIOS } from "./municipios";

/**
 * Siembra de los dos municipios del E2E.
 *
 * Corre **despues** de que Playwright levanta el servidor, no antes: por eso
 * el chequeo de arranque apunta a `/api/salud`, que no toca la base. El
 * detalle y su consecuencia estan en `playwright.config.ts`.
 *
 * Corre en el proceso de Playwright y no dentro de la aplicacion: la
 * aplicacion no da de alta municipios —eso es provisionamiento— y montar
 * una ruta de siembra seria abrir una puerta que despues queda.
 *
 * Los ayuntamientos los inserta el rol owner por la politica
 * `ayuntamientos_provision`; las personas van por `withTenant` con el rol de
 * la aplicacion, porque `usuarios` tiene FORCE RLS sin excepcion para el
 * dueno. Es la misma division que ya documenta `scripts/plataforma.sql`.
 */

export default async function preparar() {
  const urlOwner = process.env.MIGRATION_DATABASE_URL;

  if (!urlOwner) throw new Error("Falta MIGRATION_DATABASE_URL para el E2E.");

  const owner = postgres(urlOwner, { max: 1 });

  try {
    // Desde cero en cada corrida: un E2E contra restos de la anterior no
    // prueba lo que dice probar.
    await owner`TRUNCATE bitacora, ayuntamientos CASCADE`;

    for (const municipio of Object.values(MUNICIPIOS)) {
      await owner`
        INSERT INTO ayuntamientos (id, subdominio, nombre, marca)
        VALUES (
          ${municipio.id}, ${municipio.subdominio}, ${municipio.nombre},
          ${JSON.stringify(municipio.marca)}::jsonb
        )
      `;

      await withTenant(comoAyuntamientoId(municipio.id), (tx) =>
        altaDePersona(tx, comoAyuntamientoId(municipio.id), {
          nombre: `Tesoreria de ${municipio.nombre}`,
          email: CORREO,
          clave: CLAVE,
          rol: "ADMIN_MUNICIPAL",
        }),
      );
    }
  } finally {
    await owner.end();
    await cerrarConexion();
  }
}
