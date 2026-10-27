import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OpcionDeLista } from "@/shared/ui";

vi.mock("./actions/buscarSimilaresAction", () => ({
  buscarSimilaresAction: vi.fn(),
}));
vi.mock("./actions/buscarDireccionesAction", () => ({
  buscarDireccionesAction: vi.fn(),
}));

const { SelectorDeUbicacionYTipo } = await import("./SelectorDeUbicacionYTipo");

const lugares: readonly OpcionDeLista[] = [
  { valor: "lugar-1", etiqueta: "Buenavista" },
];
const calles = [{ valor: "calle-1", etiqueta: "Calle 20", lugarId: "lugar-1" }];
const tipos: readonly OpcionDeLista[] = [{ valor: "BACHE", etiqueta: "Bache" }];

const html = () =>
  renderToStaticMarkup(
    <SelectorDeUbicacionYTipo
      lugares={lugares}
      calles={calles}
      tipos={tipos}
    />,
  );

describe("SelectorDeUbicacionYTipo", () => {
  it("deja lugar y calle como alternativa visible en el HTML inicial", () => {
    const marcado = html();

    expect(marcado).toContain('name="lugarId"');
    expect(marcado).toContain('name="calleId"');
    expect(marcado).toContain('name="tipo"');
  });

  it("ofrece calles con su origen en el HTML para registrar sin JavaScript", () => {
    const marcado = html();
    const inicio = marcado.indexOf('id="reporte-calle-id"');
    const selector = marcado.slice(
      inicio,
      marcado.indexOf("</select>", inicio),
    );

    expect(selector).toContain('value="calle-1"');
    expect(selector).toContain("Calle 20 — Buenavista");
  });

  it("ofrece el modo de direccion registrada sin retirar la alternativa de via publica", () => {
    const marcado = html();

    expect(marcado).toContain("Domicilio registrado");
    expect(marcado).toContain("Lugar y calle");
    expect(marcado).toContain('name="lugarId"');
    expect(marcado).toContain('name="calleId"');
  });
});
