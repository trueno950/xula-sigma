import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PropsDeContenido } from "./contenido";
import {
  base,
  domicilio,
  domicilioId,
  enOtraColonia,
  hermanaEnOtraColoniaId,
  hermanaId,
  nodos,
  otraColoniaId,
  vecinaId,
} from "./fixturasDeDomicilios";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(<TabDeDomicilios {...base} {...resto} />);

describe("domicilios: hermanos de direccion", () => {
  /**
   * Los hermanos salen del subarbol que la pantalla ya trae, no del listado
   * plano del municipio (A1b-GREEN-03). Todo domicilio de una calle cuelga
   * del subarbol del asentamiento de esa calle
   * (`verificacionDeDomicilio.ts`, `exigirCallesDelAsentamiento`).
   */
  it("nombra los domicilios hermanos que estan en el subarbol", () => {
    expect(render({ domicilio, domicilioId })).toContain(
      "Hay 1 domicilio más en esta dirección",
    );
  });

  it("no llama hermano al mismo numero de otra calle con el mismo nombre", () => {
    const html = render({ domicilio, domicilioId });
    const hermanos = html.slice(html.indexOf("en esta dirección"));

    expect(hermanos).not.toContain(`domicilio=${vecinaId}`);
  });

  it("enlaza a un hermano de otra colonia con el lugar del hermano, no el del panel abierto", () => {
    const html = render({
      domicilio,
      domicilioId,
      nodos: [...nodos, enOtraColonia],
    });
    const inicioDelLink = html.indexOf(`domicilio=${hermanaEnOtraColoniaId}`);
    const href = html.slice(Math.max(0, inicioDelLink - 100), inicioDelLink);

    expect(href).toContain(`nodo=${otraColoniaId}`);
  });

  it("sin otro domicilio en la misma direccion no dice nada", () => {
    const html = render({
      domicilio,
      domicilioId,
      nodos: nodos.filter((nodo) => nodo.id !== hermanaId),
    });

    expect(html).not.toContain("domicilio más en esta dirección");
  });
});
