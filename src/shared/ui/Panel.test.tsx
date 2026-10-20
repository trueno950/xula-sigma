import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

const pintar = () =>
  renderToStaticMarkup(
    <Panel titulo="Vista previa">
      <p>contenido</p>
    </Panel>,
  );

/**
 * El panel cuelga del `<h1>` de `PaginaDePanel` y ninguna de sus pantallas
 * tiene un `h2` antes: el titulo del panel es el segundo nivel de esa
 * pagina. Con `h3` la jerarquia saltaba de uno a tres, que es el
 * `heading-order` de axe.
 */
describe("Panel", () => {
  it("pone el titulo en el segundo nivel, debajo del h1 de la pagina", () => {
    expect(pintar()).toMatch(
      /^<section[^>]*><h2 class="text-\[15px\] font-semibold text-caliza-tinta">Vista previa<\/h2><p>contenido<\/p><\/section>$/,
    );
  });

  it("no salta al tercer nivel", () => {
    expect(pintar()).not.toContain("<h3");
  });
});
