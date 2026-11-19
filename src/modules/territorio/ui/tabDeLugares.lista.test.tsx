import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
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
  conteos?: readonly ConteoDeLugar[],
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
  conteos,
});

const render = (
  nodos: PropsDeContenido["nodos"],
  accion?: AccionDeNodo,
  conteos?: readonly ConteoDeLugar[],
) => renderToStaticMarkup(<TabDeLugares {...props(nodos, accion, conteos)} />);

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

describe("la pestana vacia dice que le falta", () => {
  it("un asentamiento sin colonias lo dice con su nombre", () => {
    const html = render([]);

    expect(html).toContain("Kiní no tiene colonias todavía.");
    expect(html).not.toContain("no tiene lugares adentro");
  });

  /** S6 de `territorio-ux`: el vacio inicial ofrece llenarse. */
  it("el vacio inicial ofrece agregar la primera colonia", () => {
    const html = render([]);

    expect(html).toContain(">Agregar colonia</a>");
    expect(html).toContain("Kiní no tiene colonias todavía.");
  });
});

/**
 * S5 de `territorio-ux`: los domicilios que cuelgan directo del
 * asentamiento no aparecian en ninguna fila, asi que las colonias sumaban
 * menos que la pestana Domicilios.
 */
describe("la fila de los domicilios sin colonia", () => {
  const laColonia = colonia(1, "Centro");

  it("suma los domicilios que no cuelgan de ninguna colonia", () => {
    const html = render([laColonia], undefined, [
      {
        lugarId: laColonia.id,
        domicilios: 6,
        domiciliosDirectos: 6,
        calles: null,
      },
      { lugarId: kiniId, domicilios: 9, domiciliosDirectos: 3, calles: 1 },
    ]);

    expect(html).toContain("Sin colonia");
    expect(html).toContain("Domicilios registrados directo en la cabecera");
    expect(html).toContain("3 domicilios");
  });

  it("la fila entra a la pestana Domicilios del lugar", () => {
    const html = render([laColonia], undefined, [
      { lugarId: kiniId, domicilios: 9, domiciliosDirectos: 3, calles: 1 },
    ]);

    expect(html).toContain(
      `href="/territorio?raiz=${kiniId}&amp;nodo=${kiniId}&amp;vista=domicilios"`,
    );
  });

  it("sin domicilios directos no hay fila que sumar", () => {
    const html = render([laColonia], undefined, [
      { lugarId: kiniId, domicilios: 2, domiciliosDirectos: 0, calles: 1 },
    ]);

    expect(html).not.toContain("Sin colonia");
  });
});
