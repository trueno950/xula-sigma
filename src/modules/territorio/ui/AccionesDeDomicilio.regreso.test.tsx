import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PropsDeContenido } from "./contenido";
import { base, domicilio, domicilioId } from "./fixturasDeDomicilios";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const PERSONA = "88888888-8888-4888-8888-888888888888";
const REGRESO = `/padron/${PERSONA}`;

/** El panel del domicilio sobre la lista, que es donde vive «Corregir». */
const panelDelDomicilio = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(
    <TabDeDomicilios
      {...base}
      domicilio={domicilio}
      domicilioId={domicilioId}
      {...resto}
    />,
  );

const enlaceACorregir = (regreso: string | undefined) =>
  `href="/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios&amp;accion=corregirDomicilio&amp;domicilio=${domicilioId}${
    regreso ? `&amp;regreso=${encodeURIComponent(regreso)}` : ""
  }#panel-de-correccion"`;

/**
 * S4 de `territorio-advertencias`: quien llego desde la ficha de una persona
 * no la pierde al abrir la correccion.
 */
describe("AccionesDeDomicilio: «Corregir» conserva el regreso", () => {
  it("con regreso, el enlace lo lleva consigo", () => {
    const html = panelDelDomicilio({ regreso: REGRESO });

    expect(html).toContain(enlaceACorregir(REGRESO));
  });

  it("sin regreso, el enlace es el mismo de siempre", () => {
    const html = panelDelDomicilio();

    expect(html).toContain(enlaceACorregir(undefined));
    expect(html).not.toContain("regreso=");
  });
});
