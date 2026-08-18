import { afterAll, afterEach, describe, expect, it } from "vitest";
import { limpiar, motivoDeFalla, owner } from "./municipiosDePrueba";
import {
  comoSuperAdminEn,
  sembrarPersona,
  superAdmin,
  unMunicipio,
} from "./superAdminDePrueba";

/**
 * Lo que `xula_super_admin` **no** puede hacer.
 *
 * Solo las negativas: son las que sostienen que el `SUPER_ADMIN` no sea
 * llave maestra. El unico camino en que si toca datos de un municipio esta
 * en `restablecerAdmin.isolation.test.ts`, y el camino feliz del alta en
 * `provision.isolation.test.ts`.
 */

afterEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await superAdmin.end();
  await owner.end();
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

  it("no puede leer la bitacora, ni siquiera la que escribio", async () => {
    /**
     * La bitacora es de agregado y de nadie: quien la escribe tampoco la
     * lee. **Escribir si puede** —`bitacora_alta_plataforma` le da INSERT—
     * y por eso el nombre de este test decia antes "ni escribir", que era
     * falso: lo uso `withAltaDeAyuntamiento` para la traza del alta y
     * `scripts/restablecer-admin.sql` para la del destrabe. Lo que ese
     * INSERT no puede es salirse del tenant, y eso lo prueba el test de
     * abajo.
     */
    const id = await unMunicipio();

    const motivo = await motivoDeFalla(() =>
      comoSuperAdminEn(id, (tx) => tx`SELECT id FROM bitacora`),
    );

    expect(motivo).toMatch(/permission denied/i);
  });

  it("no puede escribir en la bitacora de otro municipio", async () => {
    /**
     * El `WITH CHECK` de `bitacora_alta_plataforma` exige
     * `ayuntamiento_id = tenantActual`. Sin este test, el unico camino de
     * escritura que tiene el rol sobre una tabla operativa quedaba sin
     * prueba de aislamiento: se sabia que escribe, no que no puede escribir
     * en el municipio de al lado.
     */
    const propio = await unMunicipio();
    const ajeno = await unMunicipio();

    const motivo = await motivoDeFalla(() =>
      comoSuperAdminEn(
        propio,
        (tx) => tx`
          INSERT INTO bitacora (ayuntamiento_id, accion, entidad)
          VALUES (${ajeno}, 'ALTA_AYUNTAMIENTO', 'ayuntamientos')
        `,
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });
});
