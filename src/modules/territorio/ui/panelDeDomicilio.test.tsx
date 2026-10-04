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
  renderToStaticMarkup(<TabDeDomicilios {...base} {...resto} />);

describe("domicilios: fila y panel", () => {
  it("la fila de un domicilio enlaza a su panel", () => {
    const html = render();

    expect(html).toContain(`domicilio=${domicilioId}`);
  });

  it("la fila se arma con la calle y el numero del nodo del subarbol", () => {
    const html = render();

    expect(html).toContain("Calle 21 21");
    expect(html).toContain("Centro");
  });

  it("el panel muestra los datos y las dos acciones", () => {
    const html = render({ domicilio, domicilioId });

    expect(html).toContain("Calle 21 21");
    expect(html).toContain("Porton azul");
    expect(html).toContain("Corregir");
    expect(html).toContain("Dar de baja");
    expect(html).toContain('name="accion" value="corregirDomicilio"');
    expect(html).toContain('name="accion" value="bajaDomicilio"');
  });

  it("la baja vive dentro de un details cerrado, despues de Corregir", () => {
    const html = render({ domicilio, domicilioId });
    const abiertos = html.match(/<details[^>]* open/g);

    expect(html.match(/<details/g)).toHaveLength(2);
    expect(abiertos).toBeNull();
    expect(html.indexOf("Corregir")).toBeLessThan(html.indexOf("Dar de baja"));
  });

  it("un rol sin escritura ve el panel sin acciones", () => {
    const html = render({
      domicilio,
      domicilioId,
      permisos: permisosDeTerritorio("CONSULTA"),
    });

    expect(html).toContain("Calle 21 21");
    expect(html).not.toContain("Corregir");
    expect(html).not.toContain("Dar de baja");
  });
});
