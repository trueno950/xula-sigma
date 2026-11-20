import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnlacesDeLaEntrada } from "./EnlacesDeLaEntrada";

/**
 * La entrada tenia dos buscadores apilados que se veian iguales: el de
 * domicilio, aca, y el de lugares, en `BuscadorDeLugares`. El usuario: «veo
 * dos buscadores uno debajo del otro [...] se ve un poco raro». Queda uno
 * solo, el de lugares, que ofrece llevar la misma busqueda al registro.
 */
describe("los enlaces de la entrada", () => {
  it("ya no traen un segundo buscador", () => {
    const html = renderToStaticMarkup(<EnlacesDeLaEntrada />);

    expect(html).not.toMatch(/<form\b/);
    expect(html).not.toMatch(/<input\b/);
    expect(html).not.toContain("Buscar domicilio");
  });
});
