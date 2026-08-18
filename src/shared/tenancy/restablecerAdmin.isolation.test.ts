import { afterAll, afterEach, describe, expect, it } from "vitest";
import { limpiar, owner } from "./municipiosDePrueba";
import {
  clavesDe,
  comoSuperAdminEn,
  sembrarPersona,
  superAdmin,
  unMunicipio,
} from "./superAdminDePrueba";

/**
 * El unico caso en que la plataforma toca datos de un municipio: destrabar
 * al `ADMIN_MUNICIPAL` que se quedo afuera.
 *
 * Aparte de `superAdminAcotado.isolation.test.ts`, que junta las negativas.
 * Este archivo cubre el camino que **si** existe, y que hasta la tarea 4.16
 * no ejecutaba nadie: `cuentas_restablece_admin` estaba migrada y probada
 * por lo que niega, sin un solo llamador. Quien la usa hoy es
 * `scripts/restablecer-admin.sql`, y estos tests corren lo mismo que hace
 * ese script.
 */

afterEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await superAdmin.end();
  await owner.end();
});

describe("restablecimiento de la credencial del ADMIN_MUNICIPAL", () => {
  it("cambia la del administrador y solo esa", async () => {
    /**
     * Que el OPERADOR salga con su clave intacta **despues de un UPDATE que
     * no lo excluyo** es lo que hay que demostrar: el alcance no lo elige la
     * consulta, lo elige la politica. El porque del `UPDATE` sin `WHERE`
     * esta en `scripts/restablecer-admin.sql`.
     */
    const id = await unMunicipio();

    await sembrarPersona(id, "ADMIN_MUNICIPAL", "admin@uno.test");
    await sembrarPersona(id, "OPERADOR", "opera@uno.test");

    await comoSuperAdminEn(
      id,
      (tx) => tx`UPDATE cuentas SET password = 'clave-nueva'`,
    );

    expect(await clavesDe(id)).toEqual([
      { rol: "ADMIN_MUNICIPAL", password: "clave-nueva" },
      { rol: "OPERADOR", password: "clave-vieja" },
    ]);
  });

  it("no alcanza la credencial de un ADMIN_MUNICIPAL de otro tenant", async () => {
    const propio = await unMunicipio();
    const ajeno = await unMunicipio();

    await sembrarPersona(propio, "ADMIN_MUNICIPAL", "admin@propio.test");
    await sembrarPersona(ajeno, "ADMIN_MUNICIPAL", "admin@ajeno.test");

    await comoSuperAdminEn(
      propio,
      (tx) => tx`UPDATE cuentas SET password = 'clave-nueva'`,
    );

    expect(await clavesDe(ajeno)).toEqual([
      { rol: "ADMIN_MUNICIPAL", password: "clave-vieja" },
    ]);
  });
});
