import { describe, expect, it } from "vitest";
import {
  puedeAdministrarUsuarios,
  puedeCambiarMarca,
  puedeDarDeBaja,
  puedeEscribir,
  puedeExportar,
  puedeRestablecerContrasenia,
  ROLES,
  type Rol,
} from "./roles";

/**
 * Las tablas se recorren enteras contra `ROLES`, no caso por caso.
 *
 * El dia que entre un quinto rol, un test que enumere tres casos sigue
 * verde y el rol nuevo queda con el permiso que le toque por descarte.
 * Recorriendo `ROLES` falta la fila y el test lo dice: agregar un rol
 * obliga a decidir que puede hacer.
 */

const todosMenos = (...excluidos: Rol[]) =>
  ROLES.filter((rol) => !excluidos.includes(rol));

describe("puedeAdministrarUsuarios", () => {
  it("solo ADMIN_MUNICIPAL administra usuarios", () => {
    expect(puedeAdministrarUsuarios("ADMIN_MUNICIPAL")).toBe(true);

    for (const rol of todosMenos("ADMIN_MUNICIPAL")) {
      expect(puedeAdministrarUsuarios(rol)).toBe(false);
    }
  });

  it("SUPER_ADMIN no administra usuarios de un municipio", () => {
    // Da de alta ayuntamientos y destraba al ADMIN_MUNICIPAL. No opera
    // datos de ningun municipio: es la primera fila de la tabla del spec.
    expect(puedeAdministrarUsuarios("SUPER_ADMIN")).toBe(false);
  });
});

describe("puedeEscribir", () => {
  it("CONSULTA es el unico de solo lectura", () => {
    expect(puedeEscribir("CONSULTA")).toBe(false);

    for (const rol of todosMenos("CONSULTA")) {
      expect(puedeEscribir(rol)).toBe(true);
    }
  });
});

describe("puedeRestablecerContrasenia", () => {
  it("ADMIN_MUNICIPAL restablece a la gente de su ayuntamiento", () => {
    for (const objetivo of todosMenos("SUPER_ADMIN")) {
      expect(puedeRestablecerContrasenia("ADMIN_MUNICIPAL", objetivo)).toBe(
        true,
      );
    }
  });

  it("ADMIN_MUNICIPAL no restablece a un SUPER_ADMIN", () => {
    // La escalada que cierra esta linea, en `esIntocable` de `roles.ts`.
    // Aca solo se provoca.
    expect(puedeRestablecerContrasenia("ADMIN_MUNICIPAL", "SUPER_ADMIN")).toBe(
      false,
    );
  });

  it("SUPER_ADMIN restablece unicamente al ADMIN_MUNICIPAL", () => {
    expect(puedeRestablecerContrasenia("SUPER_ADMIN", "ADMIN_MUNICIPAL")).toBe(
      true,
    );

    for (const objetivo of todosMenos("ADMIN_MUNICIPAL")) {
      expect(puedeRestablecerContrasenia("SUPER_ADMIN", objetivo)).toBe(false);
    }
  });

  it("OPERADOR y CONSULTA no restablecen a nadie", () => {
    for (const actor of ["OPERADOR", "CONSULTA"] as const) {
      for (const objetivo of ROLES) {
        expect(puedeRestablecerContrasenia(actor, objetivo)).toBe(false);
      }
    }
  });
});

describe("puedeDarDeBaja", () => {
  it("ADMIN_MUNICIPAL da de baja a la gente de su ayuntamiento", () => {
    for (const objetivo of todosMenos("SUPER_ADMIN")) {
      expect(puedeDarDeBaja("ADMIN_MUNICIPAL", objetivo)).toBe(true);
    }
  });

  it("nadie da de baja a un SUPER_ADMIN", () => {
    for (const actor of ROLES) {
      expect(puedeDarDeBaja(actor, "SUPER_ADMIN")).toBe(false);
    }
  });

  it("SUPER_ADMIN no da de baja: destraba, no administra", () => {
    // Por que, en `puedeDarDeBaja`.
    for (const objetivo of ROLES) {
      expect(puedeDarDeBaja("SUPER_ADMIN", objetivo)).toBe(false);
    }
  });

  it("OPERADOR y CONSULTA no dan de baja a nadie", () => {
    for (const actor of ["OPERADOR", "CONSULTA"] as const) {
      for (const objetivo of ROLES) {
        expect(puedeDarDeBaja(actor, objetivo)).toBe(false);
      }
    }
  });
});

describe("estado entre llamadas", () => {
  it("ninguna regla depende de estado entre llamadas", () => {
    /**
     * El nombre dice lo que el cuerpo prueba, y nada mas. Antes prometia
     * "no toca nada de afuera", que es pureza, y este assert no la prueba:
     * compara dos corridas entre si, asi que una regla que devolviera mal
     * de forma consistente pasaria igual.
     *
     * La pureza no se prueba con un espia — se prueba porque el modulo no
     * tiene con que hacer IO. Lo que queda verificable aca es el estado
     * entre llamadas: memoizacion con bug, o una variable de modulo.
     */
    const primera = ROLES.map((actor) =>
      ROLES.map((objetivo) => puedeRestablecerContrasenia(actor, objetivo)),
    );
    const segunda = ROLES.map((actor) =>
      ROLES.map((objetivo) => puedeRestablecerContrasenia(actor, objetivo)),
    );

    expect(segunda).toEqual(primera);
  });
});

describe("puedeExportar", () => {
  it("solo ADMIN_MUNICIPAL se lleva los datos de su municipio", () => {
    expect(puedeExportar("ADMIN_MUNICIPAL")).toBe(true);

    for (const rol of todosMenos("ADMIN_MUNICIPAL")) {
      expect(puedeExportar(rol)).toBe(false);
    }
  });

  it("SUPER_ADMIN no exporta datos de un municipio", () => {
    // Por que la plataforma queda afuera, en `puedeExportar`. Este test
    // existe porque es el permiso que mas tentacion da de ampliar.
    expect(puedeExportar("SUPER_ADMIN")).toBe(false);
  });
});

describe("puedeCambiarMarca", () => {
  it("solo ADMIN_MUNICIPAL cambia la marca de su ayuntamiento", () => {
    expect(puedeCambiarMarca("ADMIN_MUNICIPAL")).toBe(true);

    for (const rol of todosMenos("ADMIN_MUNICIPAL")) {
      expect(puedeCambiarMarca(rol)).toBe(false);
    }
  });

  it("SUPER_ADMIN no cambia la marca de ningun ayuntamiento", () => {
    // Por que, en `puedeCambiarMarca`. Misma linea que `puedeExportar`.
    expect(puedeCambiarMarca("SUPER_ADMIN")).toBe(false);
  });
});
