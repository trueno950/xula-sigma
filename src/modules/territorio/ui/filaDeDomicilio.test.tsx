import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { FilaDeDomicilio } from "./FilaDeDomicilio";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");

const domicilio = {
  id: comoDomicilioId("55555555-5555-4555-8555-555555555555"),
  calle: "Calle 21",
  calleId: comoCalleId("33333333-3333-4333-8333-333333333333"),
  numero: "5" as string | null,
  lugar: "Centro",
  lugarId: coloniaId,
  raizId: cabeceraId,
};

const render = (numero: string | null) =>
  renderToStaticMarkup(
    <FilaDeDomicilio domicilio={{ ...domicilio, numero }} />,
  );

describe("FilaDeDomicilio", () => {
  it("abre el panel del domicilio con la raiz que trae la fila", () => {
    const html = render("5");

    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${coloniaId}&amp;vista=domicilios&amp;domicilio=${domicilio.id}#panel-de-domicilio"`,
    );
  });

  it("se lee como la direccion y su asentamiento, en dos tonos", () => {
    const html = render("5");

    expect(html).toContain("Calle 21 #5");
    expect(html).toContain("Centro");
    expect(html).toContain('aria-label="Calle 21 #5, Centro"');
  });

  /**
   * La fila entera es el enlace -y con el, el chevron del telefono-: quien la
   * toca abre el domicilio sin apuntarle a la direccion, que es lo que hacia
   * la tabla de celdas sueltas.
   */
  it("deja la fila entera como enlace, con su chevron", () => {
    const html = render("5");

    expect(html).toContain("<a ");
    expect(html).toContain("data-chevron");
  });

  it("sin numero lo dice, y no inventa una barra", () => {
    const html = render(null);

    expect(html).toContain("Calle 21 sin número");
    expect(html).not.toContain("S/N");
  });
});
