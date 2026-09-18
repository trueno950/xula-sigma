import { describe, expect, it } from "vitest";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "../application/registroDeDomicilios";
import { comoLugarId } from "../domain";
import {
  construirHrefDeDomicilios,
  hrefDeVerMasDeDomicilios,
} from "./hrefsDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");

describe("construirHrefDeDomicilios", () => {
  it("sin parametros, la ruta pelada", () => {
    expect(construirHrefDeDomicilios({})).toBe("/territorio/domicilios");
  });

  it("preserva la busqueda por calle", () => {
    expect(construirHrefDeDomicilios({ filtros: { calle: "Calle 21" } })).toBe(
      "/territorio/domicilios?q=Calle+21",
    );
  });

  it("preserva el numero y la raiz", () => {
    expect(
      construirHrefDeDomicilios({
        filtros: { raizId: cabeceraId, numero: "5" },
      }),
    ).toBe(`/territorio/domicilios?numero=5&raiz=${cabeceraId}`);
  });

  it("omite limite cuando es el tamano de pagina por defecto", () => {
    expect(construirHrefDeDomicilios({ limite: TAMANO_DE_PAGINA })).toBe(
      "/territorio/domicilios",
    );
  });

  it("incluye limite cuando difiere del default y combina todo", () => {
    expect(
      construirHrefDeDomicilios({
        filtros: { raizId: cabeceraId, calle: "Calle 21", numero: "5" },
        limite: TAMANO_DE_PAGINA * 2,
      }),
    ).toBe(
      `/territorio/domicilios?q=Calle+21&numero=5&raiz=${cabeceraId}&limite=${
        TAMANO_DE_PAGINA * 2
      }`,
    );
  });
});

describe("hrefDeVerMasDeDomicilios", () => {
  it("suma un tamano de pagina al limite implicito (50 -> 100)", () => {
    expect(hrefDeVerMasDeDomicilios({})).toBe(
      `/territorio/domicilios?limite=${TAMANO_DE_PAGINA * 2}`,
    );
  });

  it("crece sobre el limite actual y conserva los filtros", () => {
    expect(
      hrefDeVerMasDeDomicilios({
        filtros: { calle: "Calle 21" },
        limite: TAMANO_DE_PAGINA * 2,
      }),
    ).toBe(`/territorio/domicilios?q=Calle+21&limite=${TAMANO_DE_PAGINA * 3}`);
  });

  /**
   * En el tope, "Ver mas" pedia una pagina mas y el `.max()` del esquema la
   * tiraba con `.catch(undefined)`: el limite volvia al default y la
   * pantalla se reiniciaba a la primera pagina sin decir nada. Un tope que
   * reinicia es peor que un tope que se queda quieto.
   */
  it("en el tope no pasa del tope, en vez de reiniciar al default", () => {
    const href = hrefDeVerMasDeDomicilios({ limite: LIMITE_MAXIMO });

    expect(href).toContain(`limite=${LIMITE_MAXIMO}`);
  });
});
