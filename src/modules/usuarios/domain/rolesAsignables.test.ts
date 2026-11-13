import { describe, expect, it } from "vitest";
import { esRolAsignable, ROLES_ASIGNABLES } from "./rolesAsignables";

/**
 * S3: «Operador y Consulta (Recomendado)». Lo que se prueba es que el
 * conjunto no pueda crecer sin que alguien lo decida, ni por un `as Rol`
 * apurado.
 */

/** Escrito aca y no importado de `shared/auth`: `domain` no importa shared. */
const TODOS_LOS_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MUNICIPAL",
  "OPERADOR",
  "CONSULTA",
];

const NO_ASIGNABLES = TODOS_LOS_ROLES.filter(
  (rol) => !(ROLES_ASIGNABLES as readonly string[]).includes(rol),
);

describe("ROLES_ASIGNABLES", () => {
  it("es exactamente operador y consulta", () => {
    expect([...ROLES_ASIGNABLES]).toEqual(["OPERADOR", "CONSULTA"]);
  });

  it("sus dos valores son roles del sistema", () => {
    for (const rol of ROLES_ASIGNABLES) {
      expect(TODOS_LOS_ROLES).toContain(rol);
    }
  });

  it("deja afuera a los dos roles que administran", () => {
    expect(ROLES_ASIGNABLES).not.toContain("ADMIN_MUNICIPAL");
    expect(ROLES_ASIGNABLES).not.toContain("SUPER_ADMIN");
  });
});

describe("esRolAsignable", () => {
  it.each([...ROLES_ASIGNABLES])("acepta %s", (rol) => {
    expect(esRolAsignable(rol)).toBe(true);
  });

  it.each(NO_ASIGNABLES)("rechaza %s", (rol) => {
    expect(esRolAsignable(rol)).toBe(false);
  });

  it.each([["Operador"], ["operador"], [""], [null], [42], [{}]])(
    "rechaza %s, que no es un rol del sistema",
    (valor) => {
      expect(esRolAsignable(valor)).toBe(false);
    },
  );
});
