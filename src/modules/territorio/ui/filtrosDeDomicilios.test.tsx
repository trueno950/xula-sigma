import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OpcionDeLista } from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";
import { comoLugarId } from "../domain";
import { FiltrosDeDomicilios } from "./FiltrosDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const raices: readonly OpcionDeLista[] = [
  { valor: cabeceraId, etiqueta: "Tepakan (cabecera)" },
];

const render = (filtros: FiltrosDeRegistro = {}) =>
  renderToStaticMarkup(
    <FiltrosDeDomicilios filtros={filtros} raices={raices} />,
  );

const pista =
  "Escriba la calle y, si la sabe, el número seguido: Calle 20 101. También busca por asentamiento. No distingue acentos ni mayúsculas.";

describe("FiltrosDeDomicilios", () => {
  it("es un solo formulario GET nativo, con su «Buscar»", () => {
    const html = render();

    expect(html.match(/<form/g) ?? []).toHaveLength(1);
    expect(html).toContain('method="get"');
    expect(html).toContain('type="submit"');
    expect(html).toContain("Buscar");
  });

  /**
   * S9: el numero no tiene caja propia. La pista lo pone dentro del mismo
   * campo, y la busqueda reparte el texto por su cuenta.
   */
  it("un solo campo que pide calle y numero, con la pista del ejemplo", () => {
    const html = render();

    expect(html).toContain("Calle y número");
    expect(html).toContain('placeholder="Calle 20 101"');
    expect(html).toContain(pista);
    expect(html).not.toContain('name="numero"');
  });

  it("el asentamiento vive en un pliegue que arranca cerrado", () => {
    const html = render();
    const pliegue = html.slice(html.indexOf("<details"));

    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(pliegue).toContain('name="raiz"');
    expect(pliegue).toContain("Tepakan (cabecera)");
  });

  /**
   * El N del pliegue: solo el asentamiento, porque es el unico filtro que se
   * guarda adentro. La busqueda se ve en el campo y no se cuenta.
   */
  it("el pliegue cuenta los filtros que guarda", () => {
    expect(render()).toContain("(0)");
    expect(render({ raizId: cabeceraId })).toContain("(1)");
    expect(render({ busqueda: "Calle 20" })).toContain("(0)");
  });

  it("los filtros puestos vuelven al formulario", () => {
    const html = render({ busqueda: "Calle 20", raizId: cabeceraId });

    expect(html).toContain('value="Calle 20"');
    expect(html).toContain(`value="${cabeceraId}" selected=""`);
  });

  it("el campo de busqueda se anuncia por su etiqueta", () => {
    const html = render();

    expect(html).toContain('for="q"');
    expect(html).toContain('id="q"');
  });
});
