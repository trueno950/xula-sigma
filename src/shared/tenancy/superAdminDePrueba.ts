import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { appSinTenant, owner } from "./municipiosDePrueba";

/**
 * Los ayudantes de los tests que provocan a `xula_super_admin`.
 *
 * Viven aparte porque los usan dos archivos —`superAdminAcotado` para lo
 * que el rol no puede y `restablecerAdmin` para el unico camino en que si
 * toca datos de un municipio— y porque juntos empujaban ese primer archivo
 * por encima de las 200 lineas.
 *
 * Todo por SQL directo y no por `withAltaDeAyuntamiento`: lo que se
 * verifica son las politicas de `0002_super_admin.sql`, no la forma de una
 * firma. Una firma se cambia el mes que viene; la politica es lo que queda
 * cuando alguien escriba otro camino de alta.
 */

const url = process.env.SUPER_ADMIN_DATABASE_URL;

if (!url) throw new Error("Falta SUPER_ADMIN_DATABASE_URL.");

export const superAdmin = postgres(url, { max: 1, prepare: false });

/** Un municipio ya existente, creado por el owner. */
export async function unMunicipio() {
  const id = randomUUID();

  await owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre)
    VALUES (${id}, ${`m-${id.slice(0, 8)}`}, 'Municipio')
  `;

  return id;
}

/**
 * Siembra una persona con su credencial, con el rol de la aplicacion.
 *
 * No va por el owner: `usuarios` tiene FORCE RLS y `xula_migrator` no tiene
 * politica, asi que su INSERT muere. Y no va por `xula_super_admin`, que
 * solo puede crear `ADMIN_MUNICIPAL` y no serviria para sembrar el
 * `OPERADOR` que hace falta como contraejemplo.
 */
export const sembrarPersona = (id: string, rol: string, correo: string) =>
  appSinTenant.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${id}, true)`;

    const [fila] = await tx`
      INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
      VALUES (${id}, 'Persona', ${correo}, ${rol})
      RETURNING id
    `;

    if (!fila) throw new Error(`No se sembro la persona ${correo}.`);

    await tx`
      INSERT INTO cuentas (ayuntamiento_id, user_id, account_id, provider_id, password)
      VALUES (${id}, ${fila.id}, ${fila.id}, 'credential', 'clave-vieja')
    `;

    return fila.id as string;
  });

/** Lo que ve el municipio, con el rol con el que opera todos los dias. */
export const clavesDe = (id: string) =>
  appSinTenant.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${id}, true)`;

    return tx`
      SELECT u.rol, c.password
        FROM cuentas c JOIN usuarios u ON u.id = c.user_id
       ORDER BY u.rol
    `;
  });

export const comoSuperAdminEn = <T>(
  id: string,
  trabajo: (tx: postgres.TransactionSql) => Promise<T>,
) =>
  superAdmin.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${id}, true)`;

    return trabajo(tx);
  });
