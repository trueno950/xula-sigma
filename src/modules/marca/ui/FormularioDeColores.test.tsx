import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormularioDeColores } from "./FormularioDeColores";

/**
 * S1: en el celular la muestra se ve **mientras se elige**. Antes era una
 * columna fija que quedaba debajo de los dos grupos de colores: con los ocho
 * colores del primario y los de acento, elegir dejaba la muestra fuera de
 * pantalla, que es justo lo que el hallazgo M1 midio.
 *
 * Ahora el formulario abre con la muestra y los grupos van despues: en el
 * telefono se elige con la muestra a la vista sin gastar una franja fija de
 * pantalla (artboard `02-vista-previa-primero`, muestra movil).
 */

vi.mock("./actions/cambiarColoresAction", () => ({
  cambiarColoresAction: "colores-action",
}));

const markup = renderToStaticMarkup(
  <FormularioDeColores
    marca={{ primario: "oklch(0.44 0.1 155)", secundario: "#e07800" }}
  />,
);

describe("FormularioDeColores", () => {
  it("la muestra va antes de los dos grupos de colores (S1)", () => {
    const muestra = markup.indexOf('data-muestra="colores"');
    const primario = markup.indexOf("Color primario");
    const acento = markup.indexOf("Color de acento");

    expect(muestra).toBeGreaterThan(-1);
    expect(muestra).toBeLessThan(primario);
    expect(muestra).toBeLessThan(acento);
  });

  it("sigue siendo un POST nativo con los dos grupos y su boton", () => {
    expect(markup).toContain('action="colores-action"');
    expect(markup).toContain('name="primario"');
    expect(markup).toContain('name="secundario"');
    expect(markup).toContain("Guardar colores");
  });
});
