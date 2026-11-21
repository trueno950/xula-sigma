import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/restablecerColoresAction", () => ({
  restablecerColoresAction: "restablecer-action",
}));

const { FormularioDeRestablecer } = await import("./FormularioDeRestablecer");

/**
 * S2: la seccion de restablecer dice que hace, **que colores se pierden** y
 * pide una confirmacion. La casilla vive en el HTML, con el `name` y el
 * `value` que la accion lee, y el `required` es la unica confirmacion que
 * existe sin JavaScript; el servidor la vuelve a exigir (ver
 * `restablecerColoresAction.test.ts` y `restablecerSinConfirmar.integration`).
 */

const markup = renderToStaticMarkup(<FormularioDeRestablecer />);

describe("FormularioDeRestablecer", () => {
  it("es una seccion con titulo propio", () => {
    expect(markup).toMatch(/<h2[^>]*>Restablecer colores<\/h2>/);
  });

  it("dice que colores se pierden y que el escudo no se toca", () => {
    expect(markup).toContain("color primario");
    expect(markup).toContain("color de acento");
    expect(markup).toContain("El escudo del ayuntamiento no se toca.");
  });

  it("pide la confirmacion con el campo que la accion exige", () => {
    const casilla = markup.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? "";

    expect(casilla).toContain('name="confirmar"');
    expect(casilla).toContain('value="si"');
    expect(casilla).toContain("required");
    expect(markup).toContain("Confirmo");
  });

  it("sigue siendo un POST nativo que dice que restablece", () => {
    expect(markup).toContain('action="restablecer-action"');
    expect(markup).toContain('name="ambito"');
    expect(markup).toContain('value="colores"');
  });
});
