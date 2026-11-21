import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClaveMostrada } from "./claveMostrada";

/**
 * S9 y S10 de `usuarios-ux` (hallazgos C1, C2 y C4) en la tarjeta de la
 * contrasenia temporal
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`).
 *
 * Sin navegador se puede afirmar que la tarjeta dice de quien es la clave
 * —nombre, correo y rol, porque mientras la tarjeta esta arriba el listado
 * sigue ofreciendo «Restablecer» en otras filas—, que la clave lleva una
 * etiqueta accesible, y que **«Copiar» no esta en el HTML del servidor**:
 * el boton lo pinta una isla cliente, y lo que se prueba aca es justamente
 * lo que se ve sin JavaScript. Que copie de verdad y que sin script no haya
 * boton lo prueba `e2e/usuariosClaveTemporal.spec.ts`.
 */

vi.mock("./actions/descartarClaveMostradaAction", () => ({
  descartarClaveMostradaAction: vi.fn(),
}));

const { AvisoDeClaveTemporal } = await import("./AvisoDeClaveTemporal");

const MOSTRADA: ClaveMostrada = {
  token: "11111111-1111-4111-8111-111111111111",
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga",
};

const NOMBRE = "Operadora de Mostrador";
const CORREO = "operadora@motul.example.com";

const pintar = (sobre: Partial<ClaveMostrada> = {}) =>
  renderToStaticMarkup(
    <AvisoDeClaveTemporal
      mostrada={{ ...MOSTRADA, ...sobre }}
      usuario={{ nombre: NOMBRE, email: CORREO, rol: "OPERADOR" }}
    />,
  );

describe("AvisoDeClaveTemporal", () => {
  it("muestra la contrasenia y de quien es: nombre, correo y rol", () => {
    const html = pintar();

    expect(html).toContain(MOSTRADA.clave);
    expect(html).toContain(`Contraseña temporal de ${NOMBRE}`);
    expect(html).toContain(CORREO);
    expect(html).toContain("rol Operador");
  });

  it("la clave se puede identificar y seleccionar sin JavaScript", () => {
    const html = pintar();

    expect(html).toContain("Contraseña de un solo uso");
    expect(html).toContain("seleccione la contraseña");
  });

  /** S10: el boton solo existe con JavaScript; el HTML del servidor no lo trae. */
  it("sin JavaScript no se pinta «Copiar», pero la clave se copia a mano", () => {
    const html = pintar();

    expect(html).not.toContain("Copiar<");
    expect(html).not.toContain("Contraseña copiada al portapapeles.");
  });

  it("ofrece darla por anotada, con el token en un campo oculto y no en la URL", () => {
    const html = pintar();

    expect(html).toContain("Ya la anoté");
    expect(html).toContain(`name="token" value="${MOSTRADA.token}"`);
    expect(html).toContain("<form");
  });

  it("el restablecimiento titula la tarjeta como contrasenia nueva", () => {
    const html = pintar({ motivo: "restablecimiento" });

    expect(html).toContain("Nueva contraseña temporal");
  });
});
