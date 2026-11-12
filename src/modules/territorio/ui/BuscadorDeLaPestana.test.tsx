import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { BuscadorDeLaPestana } from "./BuscadorDeLaPestana";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodoId = comoLugarId("22222222-2222-4222-8222-222222222222");

const base = {
  raizId,
  nodoId,
  vista: "domicilios" as const,
  etiqueta: "Buscar domicilio",
  busqueda: undefined,
};

const render = (
  resto: Partial<ComponentProps<typeof BuscadorDeLaPestana>> = {},
) => renderToStaticMarkup(<BuscadorDeLaPestana {...base} {...resto} />);

describe("BuscadorDeLaPestana", () => {
  it("avisa cuantas palabras quedaron fuera del tope de la busqueda", () => {
    const html = render({ busqueda: "Calle 22 265 entre 21 y 23 norte" });

    expect(html).toContain("se ignoraron 2 palabras");
  });

  it("con la busqueda dentro del tope no hay aviso", () => {
    expect(render({ busqueda: "Calle 22 265" })).not.toContain("se ignor");
  });

  /**
   * Calles no tiene tope de palabras: `paginaDeCalles` filtra por subcadena
   * normalizada, asi que avisar un recorte ahi seria mentirle a la operadora.
   */
  it("en la pestana Calles no avisa recorte aunque la consulta sea larga", () => {
    const html = render({
      vista: "calles",
      etiqueta: "Buscar calle",
      busqueda: "Calle 22 265 entre 21 y 23 norte",
    });

    expect(html).not.toContain("se ignor");
  });
});
