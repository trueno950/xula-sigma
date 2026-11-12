import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuscadorDePersonas } from "./BuscadorDePersonas";

const DIEZ = "a b c d e f g h i j";

describe("BuscadorDePersonas", () => {
  it("avisa cuantas palabras quedaron fuera del tope de la busqueda", () => {
    const html = renderToStaticMarkup(<BuscadorDePersonas cadena={DIEZ} />);

    expect(html).toContain("se ignoraron 2 palabras");
    expect(html).toMatch(/value="a b c d e f g h i j"/);
  });

  it("con una sola palabra fuera lo dice en singular", () => {
    const html = renderToStaticMarkup(
      <BuscadorDePersonas cadena="gpe poot canul pech maria jose lopez santos uno" />,
    );

    expect(html).toContain("se ignoró 1 palabra");
  });

  it("con la busqueda dentro del tope no hay aviso", () => {
    const html = renderToStaticMarkup(<BuscadorDePersonas cadena="gpe poot" />);

    expect(html).not.toContain("se ignor");
  });

  /**
   * S3 de `territorio-seguimiento`: el aviso cuenta las palabras con la
   * misma particion que la busqueda, y la busqueda descarta el punto suelto
   * al normalizar. Avisar de una palabra que se busca entera seria un aviso
   * falso.
   */
  it("un punto suelto dentro del tope no dispara el aviso", () => {
    const html = renderToStaticMarkup(
      <BuscadorDePersonas cadena="a b c d e f g h ." />,
    );

    expect(html).not.toContain("se ignor");
    expect(html).toMatch(/value="a b c d e f g h ."/);
  });

  it("sin busqueda no hay aviso", () => {
    expect(renderToStaticMarkup(<BuscadorDePersonas />)).not.toContain(
      "se ignor",
    );
  });
});
