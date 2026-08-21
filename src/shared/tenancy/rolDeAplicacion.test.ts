import { describe, expect, it } from "vitest";
import { problemaDeRol } from "./rolDeAplicacion";

describe("problemaDeRol", () => {
  it("un rol comun no tiene problema", () => {
    expect(
      problemaDeRol({
        usuario: "xula_app",
        rolsuper: false,
        rolbypassrls: false,
      }),
    ).toBeNull();
  });

  it("nombra al superusuario, porque RLS no lo toca", () => {
    const problema = problemaDeRol({
      usuario: "postgres",
      rolsuper: true,
      rolbypassrls: false,
    });

    expect(problema).toContain("postgres");
    expect(problema).toContain("SUPERUSER");
  });

  it("nombra el BYPASSRLS aunque no sea superusuario", () => {
    const problema = problemaDeRol({
      usuario: "xula_app",
      rolsuper: false,
      rolbypassrls: true,
    });

    expect(problema).toContain("BYPASSRLS");
  });

  it("nombra los dos atributos cuando vienen juntos", () => {
    const problema = problemaDeRol({
      usuario: "postgres",
      rolsuper: true,
      rolbypassrls: true,
    });

    expect(problema).toContain("SUPERUSER");
    expect(problema).toContain("BYPASSRLS");
  });

  it("falla si la fila no existe: no saber es no poder afirmar", () => {
    // Por que la ausencia de la fila es un problema y no un caso neutro:
    // `rolDeAplicacion.ts`.
    expect(problemaDeRol(undefined)).toContain("no se pudo verificar");
  });
});
