import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/restablecerColoresAction", () => ({
  restablecerColoresAction: "restablecer-action",
}));

const { FormularioDeRestablecer } = await import("./FormularioDeRestablecer");

/**
 * S2: el cuerpo de la fila dice que hace, **que colores se pierden** y pide
 * una confirmacion. La casilla vive en el HTML, con el `name` y el `value`
 * que la accion lee, y el `required` es la unica confirmacion que existe sin
 * JavaScript; el servidor la vuelve a exigir (ver
 * `restablecerColoresAction.test.ts` y `restablecerSinConfirmar.integration`).
 *
 * S5: el titulo lo pone el resumen de la fila (`SeccionesDeMarca`), asi que el
 * cuerpo no repite un `<h2>` que quedaria duplicado al abrir.
 */

const markup = renderToStaticMarkup(<FormularioDeRestablecer />);

describe("FormularioDeRestablecer", () => {
  it("es el cuerpo de una fila con titulo, sin repetir el encabezado (S5)", () => {
    expect(markup).not.toMatch(/<h2/);
    expect(markup).not.toContain("<section");
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
