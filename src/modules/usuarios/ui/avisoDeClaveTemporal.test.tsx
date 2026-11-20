import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClaveMostrada } from "./claveMostrada";

/**
 * S9 de `usuarios-ux` (hallazgo C1): la contrasenia temporal se queda en
 * pantalla hasta que la operadora indica que ya la anoto.
 *
 * Sin navegador lo unico que se puede afirmar es que la tarjeta trae ese
 * boton y que el token viaja en un campo oculto, no en la URL; que siga
 * visible dos segundos despues y que solo desaparezca al pulsarlo lo prueba
 * `e2e/usuariosClaveTemporal.spec.ts`.
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

const pintar = (sobre: Partial<ClaveMostrada> = {}) =>
  renderToStaticMarkup(
    <AvisoDeClaveTemporal
      mostrada={{ ...MOSTRADA, ...sobre }}
      nombre="Operadora de Mostrador"
    />,
  );

describe("AvisoDeClaveTemporal", () => {
  it("muestra la contrasenia y a quien pertenece", () => {
    const html = pintar();

    expect(html).toContain(MOSTRADA.clave);
    expect(html).toContain("Operadora de Mostrador");
    expect(html).toContain("Anótela ahora");
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
