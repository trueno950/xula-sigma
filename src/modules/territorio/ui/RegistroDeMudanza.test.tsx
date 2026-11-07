import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId } from "../domain";

vi.mock("./actions/registrarMudanzaAction", () => ({
  registrarMudanzaAction: "mudanza-action",
}));
vi.mock("./actions/buscarDomiciliosAction", () => ({
  buscarDomiciliosAction: vi.fn(),
}));

const { RegistroDeMudanza } = await import("./RegistroDeMudanza");

const personaId = "11111111-1111-4111-8111-111111111111";

const domicilio: DomicilioParaListado = {
  id: comoDomicilioId("22222222-2222-4222-8222-222222222222"),
  calle: "Calle 38",
  calleId: comoCalleId("33333333-3333-4333-8333-333333333333"),
  numero: "157",
  lugar: "Colonia Centro",
};

const pintar = (props: {
  sinHistorial: boolean;
  recienCreado?: boolean;
  preseleccionado?: boolean;
}) =>
  renderToStaticMarkup(
    <RegistroDeMudanza
      personaId={personaId}
      domicilios={[domicilio]}
      sinHistorial={props.sinHistorial}
      domicilioRecienCreado={props.recienCreado ?? false}
      {...(props.preseleccionado
        ? { domicilioPreseleccionado: domicilio.id }
        : {})}
    />,
  );

describe("RegistroDeMudanza", () => {
  it("sin historial se titula y se envia como el domicilio actual, no como mudanza", () => {
    const html = pintar({ sinHistorial: true });

    expect(html).toMatch(/<h2[^>]*>Registrar domicilio actual<\/h2>/);
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Registrar domicilio actual<\/button>/,
    );
    expect(html).not.toContain("Registrar mudanza");
  });

  it("con historial sigue siendo una mudanza", () => {
    const html = pintar({ sinHistorial: false });

    expect(html).toMatch(/<h2[^>]*>Registrar mudanza<\/h2>/);
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Registrar mudanza<\/button>/,
    );
  });

  it("ofrece registrar un domicilio nuevo en territorio con regreso a esta ficha", () => {
    const html = pintar({ sinHistorial: true });
    const href = html.match(
      /<a[^>]*href="([^"]*)"[^>]*>(?:(?!<\/a>).)*Registrar un domicilio nuevo<\/a>/,
    )?.[1];

    expect(href).toBeDefined();
    const enlace = new URL((href ?? "").replaceAll("&amp;", "&"), "http://x");
    expect(enlace.pathname).toBe("/territorio");
    expect(enlace.searchParams.get("accion")).toBe("domicilio");
    expect(enlace.searchParams.get("regreso")).toBe(`/padron/${personaId}`);
  });

  it("al volver del alta con el domicilio nuevo elegido, pide revisar la fecha y guardar", () => {
    const html = pintar({
      sinHistorial: true,
      recienCreado: true,
      preseleccionado: true,
    });

    expect(html).toContain(
      "Domicilio registrado y elegido para la mudanza. Revise la fecha y guarde.",
    );
    expect(html).not.toContain("Búsquelo abajo");
    expect(html).toMatch(/<option value="[^"]*" selected="">Calle 38 #157/);
  });

  it("al volver del alta sin domicilio elegible avisa que el domicilio ya se puede buscar", () => {
    expect(pintar({ sinHistorial: true, recienCreado: true })).toContain(
      "Domicilio registrado. Búsquelo abajo para asignarlo a esta persona.",
    );
    expect(pintar({ sinHistorial: true })).not.toContain(
      "Domicilio registrado.",
    );
  });
});
