import { describe, expect, it } from "vitest";
import {
  puedeContener,
  puedeSerRaiz,
  puedeTenerCatalogoDeCalles,
  TIPOS_DE_LUGAR,
  tiposContenidosPor,
} from "./tipoDeLugar";

/**
 * Recorrida entera contra `TIPOS_DE_LUGAR`, forma de `roles.test.ts:15`
 * (design.md seccion 7): un sexto tipo tiene que faltar en esta tabla para
 * que el test lo note, en vez de heredar un permiso por descarte.
 */
const RANGO: Record<(typeof TIPOS_DE_LUGAR)[number], number> = {
  cabecera: 0,
  comisaria: 0,
  colonia: 1,
  sector: 2,
  manzana: 3,
};

describe("puedeContener", () => {
  it("cabecera y comisaria no se contienen entre si (mismo rango 0)", () => {
    expect(puedeContener("cabecera", "comisaria")).toBe(false);
    expect(puedeContener("comisaria", "cabecera")).toBe(false);
  });

  for (const padre of TIPOS_DE_LUGAR) {
    for (const hijo of TIPOS_DE_LUGAR) {
      const esperado = RANGO[padre] < RANGO[hijo];

      it(`puedeContener(${padre}, ${hijo}) === ${esperado}`, () => {
        expect(puedeContener(padre, hijo)).toBe(esperado);
      });
    }
  }
});

describe("puedeSerRaiz", () => {
  /**
   * El mismo comentario de `tipoDeLugar.ts` ya afirma que un nodo de rango
   * 0 es "raiz por construccion". Lo que faltaba era poder preguntarlo: sin
   * esta funcion, la afirmacion vivia en un comentario y nada la usaba, asi
   * que una manzana suelta arriba de todo era una raiz perfectamente legal.
   */
  it("solo los asentamientos de rango 0 son raiz del municipio", () => {
    expect(puedeSerRaiz("cabecera")).toBe(true);
    expect(puedeSerRaiz("comisaria")).toBe(true);
    expect(puedeSerRaiz("colonia")).toBe(false);
    expect(puedeSerRaiz("sector")).toBe(false);
    expect(puedeSerRaiz("manzana")).toBe(false);
  });

  it("es exactamente lo que nadie puede contener", () => {
    // Las dos caras de la misma tabla de rangos: si algun tipo pudiera
    // contener a un rango 0, ese tipo dejaria de ser raiz y esta funcion
    // mentiria. La relacion se afirma, no se confia.
    for (const tipo of TIPOS_DE_LUGAR) {
      const nadieLoContiene = TIPOS_DE_LUGAR.every(
        (padre) => !puedeContener(padre, tipo),
      );

      expect(puedeSerRaiz(tipo)).toBe(nadieLoContiene);
    }
  });
});

describe("puedeTenerCatalogoDeCalles", () => {
  it("solo permite catalogos en cabecera y comisaria", () => {
    expect(puedeTenerCatalogoDeCalles("cabecera")).toBe(true);
    expect(puedeTenerCatalogoDeCalles("comisaria")).toBe(true);
    expect(puedeTenerCatalogoDeCalles("colonia")).toBe(false);
    expect(puedeTenerCatalogoDeCalles("sector")).toBe(false);
    expect(puedeTenerCatalogoDeCalles("manzana")).toBe(false);
  });
});

describe("tiposContenidosPor", () => {
  it("da los tipos que ese padre acepta, en el orden del catalogo", () => {
    expect(tiposContenidosPor("cabecera")).toEqual([
      "colonia",
      "sector",
      "manzana",
    ]);
    expect(tiposContenidosPor("sector")).toEqual(["manzana"]);
  });

  it("una manzana no acepta nada adentro", () => {
    // El formulario de alta la usa para decidir si ofrecer el boton: sin
    // esto, "Agregar lugar" abria un formulario sin un solo tipo valido.
    expect(tiposContenidosPor("manzana")).toEqual([]);
  });
});
