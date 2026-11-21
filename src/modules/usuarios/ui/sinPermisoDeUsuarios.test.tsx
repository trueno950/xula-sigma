import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SinPermisoDeUsuarios } from "./SinPermisoDeUsuarios";

/**
 * S15 de `usuarios-ux` (hallazgos P1, P2 y P3): quien no administra cuentas
 * se entera de cual es su rol y de a quien pedirle acceso, en vez de leer
 * «Su rol no tiene permiso» y quedarse sin salida
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`, muestra de
 * la pantalla sin permiso).
 *
 * Las dos rutas —`/usuarios` y `/usuarios/alta`— pintan este mismo cuerpo
 * dentro de su encabezado: el aviso vive aca una sola vez, y la pagina solo
 * decide el encabezado, la migaja y si hay accion.
 */

const SIN_PERMISO = "no administra cuentas";
const A_QUIEN_PEDIR = "Pida al administrador municipal que cambie su rol";

describe("SinPermisoDeUsuarios", () => {
  it("dice cual es el rol de quien esta mirando", () => {
    const html = renderToStaticMarkup(<SinPermisoDeUsuarios rol="OPERADOR" />);

    expect(html).toContain("Su rol es Operador");
    expect(html).toContain(SIN_PERMISO);
  });

  it("un rol de consulta se nombra con su propio nombre", () => {
    const html = renderToStaticMarkup(<SinPermisoDeUsuarios rol="CONSULTA" />);

    expect(html).toContain("Su rol es Consulta");
  });

  it("dice a quien pedirle acceso y que si puede usar", () => {
    const html = renderToStaticMarkup(<SinPermisoDeUsuarios rol="OPERADOR" />);

    expect(html).toContain(A_QUIEN_PEDIR);
    expect(html).toContain("El padrón, los reportes y las constancias");
  });

  it("deja una salida al panel", () => {
    const html = renderToStaticMarkup(<SinPermisoDeUsuarios rol="OPERADOR" />);

    expect(html).toContain("Volver al padrón");
    expect(html).toContain('href="/padron"');
  });
});
