import { describe, expect, it } from "vitest";
import {
  puedeAdministrarUsuarios,
  puedeDarDeBaja,
  puedeEscribir,
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
    /**
     * El spec dice "cualquier usuario de su propio ayuntamiento", escrito
     * pensando en un municipio normal, donde no vive ningun SUPER_ADMIN.
     * Pero el ayuntamiento reservado de plataforma si los tiene (tarea
     * 4.11), y ahi la lectura literal es una escalada: el ADMIN_MUNICIPAL
     * de ese ayuntamiento le cambia la contrasenia al SUPER_ADMIN y se
     * queda con la plataforma entera.
     *
     * La regla se cierra por rol y no por ayuntamiento porque la regla es
     * pura: no sabe en que municipio corre. Cerrarla aca cuesta una linea.
     */
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
    /**
     * Restablecer al ADMIN_MUNICIPAL es lo que lo destraba. Darlo de baja
     * lo dejaria sin nadie que administre el municipio, y esa decision no
     * es de plataforma.
     */
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

describe("las reglas son puras", () => {
  it("la misma entrada devuelve lo mismo y no toca nada de afuera", () => {
    /**
     * La pureza no se prueba con un espia: se prueba porque el modulo no
     * tiene con que hacer IO. Lo que si se puede verificar aca es que
     * ninguna regla dependa de estado entre llamadas.
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
