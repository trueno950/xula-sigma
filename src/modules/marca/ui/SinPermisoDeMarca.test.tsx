import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SinPermisoDeMarca } from "./SinPermisoDeMarca";

/**
 * S16 (P2) en `/marca`: quien llega con un rol que no cambia la marca se
 * entera de cual es su rol, de cual hace falta y de a quien pedirlo, en vez
 * de leer «Su rol no tiene permiso» y quedarse sin salida. El molde es el de
 * `SinPermisoDeUsuarios` (S15 de `usuarios-ux`), que el usuario aprobo.
 */

const html = (rol: Parameters<typeof SinPermisoDeMarca>[0]["rol"]) =>
  renderToStaticMarkup(<SinPermisoDeMarca rol={rol} />);

describe("SinPermisoDeMarca", () => {
  it("dice cual es el rol de quien esta mirando y que no cambia la marca", () => {
    const markup = html("OPERADOR");

    expect(markup).toContain("Su rol es Operador");
    expect(markup).toContain("no cambia la marca del ayuntamiento");
  });

  it("un rol de consulta se nombra con su propio nombre", () => {
    expect(html("CONSULTA")).toContain("Su rol es Consulta");
  });

  it("dice a quien pedirlo y donde se cambia la cuenta", () => {
    const markup = html("OPERADOR");

    expect(markup).toContain("Pida al administrador municipal");
    expect(markup).toContain("Usuarios");
  });

  it("deja una salida al panel", () => {
    const markup = html("OPERADOR");

    expect(markup).toContain("Volver al padrón");
    expect(markup).toContain('href="/padron"');
  });
});
