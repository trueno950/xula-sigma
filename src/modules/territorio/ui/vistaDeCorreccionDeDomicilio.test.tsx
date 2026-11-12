import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PropsDeContenido } from "./contenido";
import { base, domicilio, domicilioId } from "./fixturasDeDomicilios";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(
    <TabDeDomicilios
      {...base}
      domicilio={domicilio}
      domicilioId={domicilioId}
      {...resto}
    />,
  );

const panelDelDomicilio = `/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios&amp;domicilio=${domicilioId}#panel-de-domicilio`;

const PERSONA = "88888888-8888-4888-8888-888888888888";
const REGRESO = `/padron/${PERSONA}`;
const regresoEscapado = encodeURIComponent(REGRESO);

/**
 * S2 de `territorio-formularios`: dentro del panel angosto los campos median
 * 340 px. La correccion es su propia vista, a lo ancho del contenido.
 */
describe("correccion de domicilio: vista propia", () => {
  it("abre en lugar de la lista, con el titulo de la direccion", () => {
    const html = render({ accion: "corregirDomicilio" });

    expect(html).toContain('id="panel-de-correccion"');
    expect(html).toMatch(/<h2[^>]*>Corregir Calle 21 #21<\/h2>/);
    expect(html).toContain('name="accion" value="corregirDomicilio"');
    expect(html).not.toContain('aria-label="Domicilios de');
    expect(html).not.toContain('id="panel-de-domicilio"');
    expect(html).not.toContain("<details");
  });

  it("los campos cortos van en dos columnas desde md", () => {
    const html = render({ accion: "corregirDomicilio" });

    expect(html).toContain("md:grid-cols-");
  });

  it("Cancelar vuelve al panel del domicilio", () => {
    const html = render({ accion: "corregirDomicilio" });

    expect(html).toContain(`href="${panelDelDomicilio}"`);
    expect(html).toContain("Cancelar");
  });

  it("el panel enlaza a la vista en vez de plegar el formulario", () => {
    const html = render();

    expect(html).toContain(
      `href="/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios&amp;accion=corregirDomicilio&amp;domicilio=${domicilioId}#panel-de-correccion"`,
    );
    expect(html).not.toContain('name="accion" value="corregirDomicilio"');
    expect(html.match(/<details/g)).toHaveLength(1);
  });

  it("un rol sin escritura no abre la vista aunque la pida la URL", () => {
    const html = render({
      accion: "corregirDomicilio",
      permisos: permisosDeTerritorio("CONSULTA"),
    });

    expect(html).not.toContain('id="panel-de-correccion"');
    expect(html).not.toContain("Corregir");
    expect(html).toContain('id="panel-de-domicilio"');
  });
});

/**
 * S4 de `territorio-advertencias`: la correccion abierta desde la ficha de una
 * persona la conserva hasta el guardado, y el rechazo la devuelve igual.
 */
describe("correccion de domicilio: regreso a la ficha", () => {
  it("el formulario lo manda escondido", () => {
    const html = render({ accion: "corregirDomicilio", regreso: REGRESO });

    expect(html).toContain('name="regreso"');
    expect(html).toContain(`value="${REGRESO}"`);
  });

  it("«Cancelar» vuelve al panel del domicilio sin perderlo", () => {
    const html = render({ accion: "corregirDomicilio", regreso: REGRESO });

    expect(html).toContain(
      `href="/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios&amp;domicilio=${domicilioId}&amp;regreso=${regresoEscapado}#panel-de-domicilio"`,
    );
  });

  it("sin regreso no hay campo escondido y la salida no cambia", () => {
    const html = render({ accion: "corregirDomicilio" });

    expect(html).not.toContain('name="regreso"');
    expect(html).toContain(`href="${panelDelDomicilio}"`);
  });
});
