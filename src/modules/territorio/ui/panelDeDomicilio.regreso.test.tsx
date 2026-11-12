import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PropsDeContenido } from "./contenido";
import {
  base,
  domicilio,
  domicilioId,
  enOtraColonia,
  hermanaEnOtraColoniaId,
  mismaDireccion,
} from "./fixturasDeDomicilios";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const PERSONA = "88888888-8888-4888-8888-888888888888";
const REGRESO = `/padron/${PERSONA}`;

const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(
    <TabDeDomicilios
      {...base}
      domicilio={domicilio}
      domicilioId={domicilioId}
      {...resto}
    />,
  );

/** Cada `<a>` con su href y su texto visible, sin iconos ni etiquetas. */
const anclas = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, href, interior]) => ({
      href: href ?? "",
      texto: (interior ?? "").replace(/<[^>]*>/g, "").trim(),
    }),
  );

const cerrar = (html: string) =>
  anclas(html).find((ancla) => ancla.texto === "Cerrar")?.href;

const hermanos = (html: string) =>
  html.slice(
    html.indexOf("en esta dirección"),
    html.indexOf('aria-label="Domicilios de'),
  );

/**
 * S4 de `territorio-seguimiento`: quien llego desde la ficha de una persona
 * no la pierde al cerrar el panel ni al saltar a un hermano de la misma
 * direccion. «Corregir» ya lo conservaba (`AccionesDeDomicilio.regreso.test`).
 */
describe("el regreso del panel del domicilio", () => {
  it("«Cerrar» vuelve a la lista con el regreso puesto", () => {
    expect(cerrar(render({ regreso: REGRESO }))).toBe(
      `/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios&amp;regreso=${encodeURIComponent(REGRESO)}`,
    );
  });

  it("sin regreso, «Cerrar» es el mismo enlace de siempre", () => {
    const html = render();

    expect(cerrar(html)).toBe(
      `/territorio?raiz=${base.raizId}&amp;nodo=${base.lugar.id}&amp;vista=domicilios`,
    );
    expect(html).not.toContain("regreso=");
  });

  it("el enlace a un hermano lo conserva, con el nodo del hermano", () => {
    const html = render({
      regreso: REGRESO,
      mismaDireccion: [...mismaDireccion, enOtraColonia],
    });

    expect(hermanos(html)).toContain(
      `domicilio=${hermanaEnOtraColoniaId}&amp;regreso=${encodeURIComponent(REGRESO)}`,
    );
  });

  it("sin regreso, el enlace al hermano no cambia", () => {
    const html = render({ mismaDireccion: [...mismaDireccion, enOtraColonia] });

    expect(hermanos(html)).toContain(`domicilio=${hermanaEnOtraColoniaId}"`);
    expect(hermanos(html)).not.toContain("regreso=");
  });
});
