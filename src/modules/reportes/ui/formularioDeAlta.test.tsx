import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OpcionDeLista } from "@/shared/ui";

vi.mock("./actions/altaDeReporteAction", () => ({
  altaDeReporteAction: "alta-action",
}));
vi.mock("./actions/buscarSimilaresAction", () => ({
  buscarSimilaresAction: vi.fn(),
}));
vi.mock("./actions/buscarDireccionesAction", () => ({
  buscarDireccionesAction: vi.fn(),
}));

const { FormularioDeAlta } = await import("./FormularioDeAlta");

const lugares: readonly OpcionDeLista[] = [
  { valor: "lugar-1", etiqueta: "Buenavista" },
];
const calles = [{ valor: "calle-1", etiqueta: "Calle 20", lugarId: "lugar-1" }];
const tipos: readonly OpcionDeLista[] = [{ valor: "BACHE", etiqueta: "Bache" }];

const html = () =>
  renderToStaticMarkup(
    <FormularioDeAlta lugares={lugares} calles={calles} tipos={tipos} />,
  );

const posicion = (marcado: string, aguja: string): number => {
  const indice = marcado.indexOf(aguja);
  if (indice < 0) throw new Error(`El formulario no tiene «${aguja}».`);
  return indice;
};

describe("FormularioDeAlta", () => {
  it("ordena los campos tipo, dónde y detalle, en ese orden", () => {
    const marcado = html();

    const orden = [
      'name="tipo"',
      "Forma de indicar la ubicación",
      'name="lugarId"',
      'name="calleId"',
      'name="descripcion"',
      'name="referencia"',
    ].map((aguja) => posicion(marcado, aguja));

    expect(orden).toEqual([...orden].sort((a, b) => a - b));
  });

  it("titula el bloque de la ubicación antes que el del detalle", () => {
    const marcado = html();

    expect(posicion(marcado, "Qué pasó y dónde")).toBeLessThan(
      posicion(marcado, "Detalle de la incidencia"),
    );
  });

  it("dice cuáles campos son obligatorios antes de pedirlos", () => {
    expect(html()).toContain(
      "Todos los campos son obligatorios, salvo la calle y la referencia.",
    );
  });

  it("acorta la ayuda de la referencia a una sola línea que sigue avisando de no anotar vecinos", () => {
    const marcado = html();
    const ayuda = marcado.match(
      /id="reporte-referencia-ayuda"[^>]*>([^<]*)</,
    )?.[1];

    expect(ayuda).toBe("Una seña del punto, sin nombres de vecinos.");
  });

  it("sigue siendo un form nativo con los mismos campos del POST", () => {
    const marcado = html();

    expect(marcado).toContain('action="alta-action"');
    expect(marcado).toContain(">Registrar reporte<");
    for (const campo of [
      "tipo",
      "lugarId",
      "calleId",
      "descripcion",
      "referencia",
    ]) {
      expect(marcado).toMatch(new RegExp(`name="${campo}"`));
    }
  });
});
