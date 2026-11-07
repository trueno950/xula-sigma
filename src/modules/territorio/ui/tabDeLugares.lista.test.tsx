import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoLugarId, type TipoDeLugar } from "../domain";
import type { PropsDeContenido } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./actions/altaDeLugarAction", () => ({ altaDeLugarAction: vi.fn() }));

const { TabDeLugares } = await import("./TabDeLugares");

const kiniId = comoLugarId("11111111-1111-4111-8111-111111111111");

const colonia = (n: number, nombre: string, tipo: TipoDeLugar = "colonia") => ({
  clase: "lugar" as const,
  id: comoLugarId(`2222222${n}-2222-4222-8222-222222222222`),
  tipo,
  nombre,
  padreId: kiniId,
});

const props = (
  nodos: PropsDeContenido["nodos"],
  accion?: AccionDeNodo,
): PropsDeContenido => ({
  raizId: kiniId,
  lugar: { id: kiniId, tipo: "comisaria", nombre: "Kiní" },
  nodos,
  calles: [],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
});

const render = (nodos: PropsDeContenido["nodos"], accion?: AccionDeNodo) =>
  renderToStaticMarkup(<TabDeLugares {...props(nodos, accion)} />);

const COLONIAS = [
  colonia(1, "Zona Norte"),
  colonia(2, "Ébano"),
  colonia(3, "Centro"),
];

/** S1: dentro de un asentamiento solo cabe colonia, y la pestana lo dice. */
describe("el alta de la pestana Lugares nombra el unico tipo", () => {
  it("la entrada dice Agregar colonia", () => {
    const html = render(COLONIAS);

    expect(html).toMatch(/>Agregar colonia<\/a>/);
    expect(html).not.toContain("Agregar lugar");
  });

  it("el panel abierto se titula con el tipo y el padre", () => {
    const html = render(COLONIAS, "lugar");

    expect(html).toContain("Nueva colonia en Kiní");
    expect(html).not.toContain("Agregar un lugar dentro de");
  });
});

/** S3: la colonia recien creada quedaba al final de una lista sin orden. */
describe("la lista de lugares", () => {
  it("va en orden alfabetico, con los acentos en su lugar", () => {
    const html = render(COLONIAS);

    const posiciones = ["Centro", "Ébano", "Zona Norte"].map((nombre) =>
      html.indexOf(`aria-label="${nombre},`),
    );

    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
  });

  it("sin la columna Tipo cuando todas las filas son del mismo tipo", () => {
    const html = render(COLONIAS);

    expect(html).not.toMatch(/>Tipo</);
    expect(html).not.toMatch(/>Colonia</);
  });

  it("con la columna Tipo cuando los tipos se mezclan", () => {
    const html = render([
      colonia(1, "Centro"),
      colonia(2, "Dzununcan", "comisaria"),
    ]);

    expect(html).toMatch(/>Tipo</);
    expect(html).toMatch(/>Colonia</);
    expect(html).toMatch(/>Comisaría</);
  });
});
