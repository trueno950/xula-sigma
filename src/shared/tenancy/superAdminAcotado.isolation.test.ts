import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  appSinTenant,
  limpiar,
  motivoDeFalla,
  owner,
} from "./municipiosDePrueba";

/**
 * Lo que `xula_super_admin` **no** puede hacer.
 *
 * Va por SQL directo y no por `withAltaDeAyuntamiento` a proposito: lo que
 * se verifica son las politicas de `0002_super_admin.sql`, no la forma de
 * una firma. Una firma se cambia el mes que viene; la politica es lo que
 * queda cuando alguien escriba otro camino de alta.
 *
 * Aparte de `provision.isolation.test.ts`, que prueba el camino feliz y la
 * atomicidad. Aca solo estan las negativas, que son las que sostienen que
 * el `SUPER_ADMIN` no sea llave maestra.
 */

const urlSuperAdmin = process.env.SUPER_ADMIN_DATABASE_URL;
if (!urlSuperAdmin) throw new Error("Falta SUPER_ADMIN_DATABASE_URL.");
const superAdmin = postgres(urlSuperAdmin, { max: 1, prepare: false });

afterEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await superAdmin.end();
  await owner.end();
});

/** Un municipio ya existente, creado por el owner. */
async function unMunicipio() {
  const id = randomUUID();

  await owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre)
    VALUES (${id}, ${`m-${id.slice(0, 8)}`}, 'Municipio')
  `;

  return id;
}

/**
 * Siembra una persona con el rol de la aplicacion.
 *
 * No va por el owner: `usuarios` tiene FORCE RLS y `xula_migrator` no tiene
 * politica, asi que su INSERT muere. Y no va por `xula_super_admin`, que
 * solo puede crear `ADMIN_MUNICIPAL` —justamente lo que prueba el test de
 * arriba— y no serviria para sembrar el `OPERADOR`.
 */
const sembrarPersona = (id: string, rol: string, correo: string) =>
  appSinTenant.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${id}, true)`;

    const [fila] = await tx`
      INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
      VALUES (${id}, 'Persona', ${correo}, ${rol})
      RETURNING id
    `;

    if (!fila) throw new Error(`No se sembro la persona ${correo}.`);

    return fila.id as string;
  });

const comoSuperAdminEn = <T>(
  id: string,
  trabajo: (tx: postgres.TransactionSql) => Promise<T>,
) =>
  superAdmin.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${id}, true)`;

    return trabajo(tx);
  });

describe("xula_super_admin esta acotado por politicas, no por confianza", () => {
  it("el WITH CHECK solo, sin RETURNING, ya niega el OPERADOR", async () => {
    /**
     * Aisla `usuarios_alta_admin`. Sin `RETURNING` la politica de SELECT no
     * participa, asi que lo unico que puede frenar este INSERT es el
     * `WITH CHECK`.
     *
     * Hace falta porque con la condicion `rol = 'ADMIN_MUNICIPAL'` quitada a
     * mano de esa politica, los tests que van por `altaDePersona` **siguen
     * verdes**: los salva el `RETURNING`, que aplica la politica de SELECT.
     * Sin este test, aflojar el `WITH CHECK` no rompe nada y la defensa
     * queda apoyada en un detalle de como escribe otra funcion.
     */
    const id = await unMunicipio();

    const motivo = await motivoDeFalla(() =>
      comoSuperAdminEn(
        id,
        (tx) => tx`
          INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
          VALUES (${id}, 'Quien Opera', 'operador@example.com', 'OPERADOR')
        `,
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("solo ve al ADMIN_MUNICIPAL de su propio tenant", async () => {
    /**
     * `usuarios_lectura_admin` acota el SELECT a `ayuntamiento_id =
     * tenantActual AND rol = 'ADMIN_MUNICIPAL'`, y este test **siembra las
     * tres filas que hacen falta para que pueda fallar**.
     *
     * La version anterior no sembraba ninguna y afirmaba ver cero: sobre una
     * tabla vacia eso es cierto con la politica puesta, con `USING (true)` y
     * sin politica. Era decorativo. Lo encontro GGA en el PR 1.
     *
     * Con las tres, cada mitad de la condicion tiene su contraejemplo: sacar
     * el tenant hace aparecer al admin ajeno, sacar el rol hace aparecer al
     * operador propio, y el admin propio es el control positivo que impide
     * que un `USING (false)` pase por bueno.
     */
    const propio = await unMunicipio();
    const ajeno = await unMunicipio();

    const admin = await sembrarPersona(propio, "ADMIN_MUNICIPAL", "a@uno.test");
    await sembrarPersona(propio, "OPERADOR", "o@uno.test");
    await sembrarPersona(ajeno, "ADMIN_MUNICIPAL", "a@dos.test");

    const visibles = await comoSuperAdminEn(
      propio,
      (tx) => tx`SELECT id FROM usuarios`,
    );

    expect(visibles.map((fila) => fila.id)).toEqual([admin]);
  });

  it("no puede crear una fila de plataforma", async () => {
    /**
     * `ayuntamientos_alta_plataforma` tiene `WITH CHECK (NOT es_plataforma)`.
     * Sin eso la plataforma podria aparecer como un municipio mas en el
     * directorio publico, o duplicada.
     */
    const motivo = await motivoDeFalla(
      () => superAdmin`
        INSERT INTO ayuntamientos (subdominio, nombre, es_plataforma)
        VALUES ('falsa-plataforma', 'Falsa', true)
      `,
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("no ve los municipios que ya dio de alta", async () => {
    /**
     * No tiene `SELECT` sobre `ayuntamientos` —el GRANT solo da INSERT— y
     * esa ausencia es la que lo separa de una llave maestra: puede crear
     * municipios, no puede recorrer el directorio de los que existen.
     */
    await unMunicipio();

    const motivo = await motivoDeFalla(
      () => superAdmin`SELECT id FROM ayuntamientos`,
    );

    expect(motivo).toMatch(/permission denied/i);
  });

  it("no puede dar de baja a nadie ni cambiar un rol", async () => {
    /**
     * El GRANT sobre `usuarios` es solo `INSERT`. Sin `UPDATE` no hay como
     * ascender a alguien a `SUPER_ADMIN` ni darlo de baja, y la ausencia del
     * permiso no se puede olvidar de revisar como se olvida una politica.
     */
    const id = await unMunicipio();

    const motivo = await motivoDeFalla(() =>
      comoSuperAdminEn(id, (tx) => tx`UPDATE usuarios SET rol = 'SUPER_ADMIN'`),
    );

    expect(motivo).toMatch(/permission denied/i);
  });

  it("no puede leer ni escribir la bitacora de un municipio", async () => {
    // Solo INSERT, y solo del tenant activo. La bitacora es de agregado y
    // de nadie: quien la escribe tampoco la lee.
    const id = await unMunicipio();

    const motivo = await motivoDeFalla(() =>
      comoSuperAdminEn(id, (tx) => tx`SELECT id FROM bitacora`),
    );

    expect(motivo).toMatch(/permission denied/i);
  });
});
