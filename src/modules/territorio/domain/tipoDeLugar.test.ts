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
 * (design.md seccion 7): un tipo nuevo tiene que faltar en esta tabla para
 * que el test lo note, en vez de heredar un permiso por descarte.
 *
 * Dos niveles: `{cabecera, comisaria}` arriba, `colonia` abajo (design.md
 * decision 5). `sector` y `manzana` no son tipos de este catalogo.
 */
const RANGO: Record<(typeof TIPOS_DE_LUGAR)[number], number> = {
  cabecera: 0,
  comisaria: 0,
  colonia: 1,
};

describe("TIPOS_DE_LUGAR", () => {
  it("el arbol de direcciones baja a dos niveles: asentamiento y colonia", () => {
    // El catalogo entero, no una muestra: es el contrato que el CHECK
    // `lugares_tipo_valido` de la migracion 0020 repite en Postgres.
    expect(TIPOS_DE_LUGAR).toEqual(["cabecera", "comisaria", "colonia"]);
  });
});

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
   * que un lugar de rango hondo suelto arriba de todo era una raiz
   * perfectamente legal.
   */
  it("solo los asentamientos de rango 0 son raiz del municipio", () => {
    expect(puedeSerRaiz("cabecera")).toBe(true);
    expect(puedeSerRaiz("comisaria")).toBe(true);
    expect(puedeSerRaiz("colonia")).toBe(false);
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
  });
});

describe("tiposContenidosPor", () => {
  it("da los tipos que ese padre acepta, en el orden del catalogo", () => {
    expect(tiposContenidosPor("cabecera")).toEqual(["colonia"]);
    expect(tiposContenidosPor("comisaria")).toEqual(["colonia"]);
  });

  it("una colonia no acepta nada adentro: es el tipo mas profundo", () => {
    // El formulario de alta la usa para decidir si ofrecer el boton: sin
    // esto, "Agregar lugar" abria un formulario sin un solo tipo valido.
    expect(tiposContenidosPor("colonia")).toEqual([]);
  });
});
