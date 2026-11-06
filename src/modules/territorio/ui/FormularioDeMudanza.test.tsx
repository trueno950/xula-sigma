import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId } from "../domain";

vi.mock("./actions/registrarMudanzaAction", () => ({
  registrarMudanzaAction: "mudanza-action",
}));
vi.mock("./actions/buscarDomiciliosAction", () => ({
  buscarDomiciliosAction: vi.fn(),
}));

const { FormularioDeMudanza } = await import("./FormularioDeMudanza");

const personaId = "11111111-1111-4111-8111-111111111111";
const domicilios: readonly DomicilioParaListado[] = [
  {
    id: comoDomicilioId("22222222-2222-4222-8222-222222222222"),
    calle: "Calle 21",
    calleId: comoCalleId("33333333-3333-4333-8333-333333333333"),
    numero: "12",
    lugar: "Tepakan",
  },
];

describe("FormularioDeMudanza", () => {
  it("el select de domicilio lleva el anillo de foco compartido, sin `outline-none`", () => {
    const html = renderToStaticMarkup(
      <FormularioDeMudanza
        personaId={personaId}
        domicilios={domicilios}
        textoDeEnvio="Registrar mudanza"
      />,
    );

    const selects = html.match(/<select[^>]*>/g) ?? [];

    expect(selects).toHaveLength(1);
    for (const select of selects) {
      expect(select).toContain(ANILLO_DE_FOCO);
      expect(select).not.toContain("outline-none");
    }
  });

  it("el HTML inicial trae el select del municipio fuera de <noscript>, para elegir antes de que cargue JavaScript", () => {
    const html = renderToStaticMarkup(
      <FormularioDeMudanza
        personaId={personaId}
        domicilios={domicilios}
        textoDeEnvio="Registrar mudanza"
      />,
    );

    expect(html).not.toContain("<noscript>");
    expect(html).toMatch(/<select[^>]*name="domicilioId"/);
    expect(html).toContain("Tepakan — Calle 21 12");
  });

  it("el HTML del servidor no muestra un buscador que sin JavaScript no responde", () => {
    const html = renderToStaticMarkup(
      <FormularioDeMudanza
        personaId={personaId}
        domicilios={domicilios}
        textoDeEnvio="Registrar mudanza"
      />,
    );

    expect(html).not.toContain('type="search"');
    expect(html.match(/name="domicilioId"/g)).toHaveLength(1);
  });

  it("sin domicilios en el municipio dice dónde crearlos, con o sin JavaScript", () => {
    const html = renderToStaticMarkup(
      <FormularioDeMudanza
        personaId={personaId}
        domicilios={[]}
        textoDeEnvio="Registrar mudanza"
      />,
    );

    expect(html).toContain("Primero cree un domicilio desde Territorio.");
  });
});
