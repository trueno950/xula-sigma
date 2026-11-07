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
  mismaDireccion,
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
  it("nombra los domicilios hermanos que estan en la misma direccion", () => {
    expect(render({ domicilio, domicilioId })).toContain(
      "Hay 1 domicilio más en esta dirección",
    );
  });

  it("no llama hermano al mismo numero de otra calle con el mismo nombre", () => {
    const html = render({ domicilio, domicilioId });
    // El panel va antes de la lista, cuyas filas tambien enlazan a la vecina.
    const hermanos = html.slice(
      html.indexOf("en esta dirección"),
      html.indexOf('aria-label="Domicilios de'),
    );

    expect(hermanos).not.toContain(`domicilio=${vecinaId}`);
  });

  it("enlaza a un hermano de otra colonia con el lugar del hermano, no el del panel abierto", () => {
    const html = render({
      domicilio,
      domicilioId,
      mismaDireccion: [...mismaDireccion, enOtraColonia],
    });
    const inicioDelLink = html.indexOf(`domicilio=${hermanaEnOtraColoniaId}`);
    const href = html.slice(Math.max(0, inicioDelLink - 100), inicioDelLink);

    expect(href).toContain(`nodo=${otraColoniaId}`);
  });

  it("sin otro domicilio en la misma direccion no dice nada", () => {
    const html = render({
      domicilio,
      domicilioId,
      mismaDireccion: mismaDireccion.filter((fila) => fila.id !== hermanaId),
    });

    expect(html).not.toContain("domicilio más en esta dirección");
  });
});
