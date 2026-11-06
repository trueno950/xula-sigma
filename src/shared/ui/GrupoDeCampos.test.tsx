import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrupoDeCampos } from "./GrupoDeCampos";

const leyenda = (html: string) =>
  html.match(/<legend class="([^"]*)"/)?.[1] ?? "";

describe("GrupoDeCampos", () => {
  it("en una pagina, la leyenda va en Headline", () => {
    const html = renderToStaticMarkup(
      <GrupoDeCampos titulo="Datos">
        <input />
      </GrupoDeCampos>,
    );

    expect(leyenda(html)).toContain("text-[1.25rem]");
  });

  // Dentro de un `Panel` el titulo ya es Headline: la leyenda baja a Title
  // para no quedar por encima de el.
  it("dentro de un panel, la leyenda baja a Title", () => {
    const html = renderToStaticMarkup(
      <GrupoDeCampos titulo="Dónde" nivel="subseccion">
        <input />
      </GrupoDeCampos>,
    );

    expect(leyenda(html)).toContain("text-[15px]");
    expect(leyenda(html)).not.toContain("text-[1.25rem]");
  });
});
