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

const rosa = {
  personaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  nombreCompleto: "Rosa Pech",
};
const ana = {
  personaId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  nombreCompleto: "Ana Can",
};

const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(
    <TabDeDomicilios {...base} domicilio={domicilio} {...resto} />,
  );

const seccionDeResidentes = (html: string) =>
  html.slice(html.indexOf("Residentes"), html.indexOf("Corregir"));

const formularioDeBaja = (html: string) =>
  html.slice(html.indexOf('value="bajaDomicilio"'));

describe("panel del domicilio: residentes", () => {
  it("lista a cada residente con enlace a su ficha del padron", () => {
    const html = render({ domicilioId, residentes: [ana, rosa] });
    const seccion = seccionDeResidentes(html);

    expect(seccion).toContain(`href="/padron/${ana.personaId}"`);
    expect(seccion).toContain(">Ana Can<");
    expect(seccion).toContain(`href="/padron/${rosa.personaId}"`);
    expect(seccion).toContain(">Rosa Pech<");
  });

  it("sin residentes dice que nadie la tiene como residencia vigente", () => {
    const html = render({ domicilioId, residentes: [] });

    expect(seccionDeResidentes(html)).toContain(
      "Nadie tiene registrada esta dirección como residencia vigente.",
    );
  });

  it("un rol de consulta tambien ve a los residentes", () => {
    const html = render({
      domicilioId,
      residentes: [rosa],
      permisos: permisosDeTerritorio("CONSULTA"),
    });

    expect(html).toContain(`href="/padron/${rosa.personaId}"`);
  });

  it("con residentes, la baja avisa a quien mudar antes de enviarla", () => {
    const html = render({ domicilioId, residentes: [ana, rosa] });
    const baja = formularioDeBaja(html);

    expect(baja).toContain(
      "Antes de dar de baja esta dirección, registre la mudanza de:",
    );
    expect(baja).toContain(`href="/padron/${ana.personaId}"`);
    expect(baja).toContain(`href="/padron/${rosa.personaId}"`);
  });

  it("la baja manda el domicilio para que un rechazo vuelva a su panel", () => {
    const html = render({ domicilioId, residentes: [rosa] });

    expect(formularioDeBaja(html)).toContain(
      `name="domicilio" value="${domicilioId}"`,
    );
  });

  it("sin residentes, la baja conserva su explicacion y no avisa", () => {
    const html = render({ domicilioId, residentes: [] });
    const baja = formularioDeBaja(html);

    expect(baja).toContain("deja de listarse");
    expect(baja).not.toContain("registre la mudanza");
    expect(baja).toContain("Dar de baja Calle 21 21");
  });
});
