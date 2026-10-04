import { describe, expect, it } from "vitest";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "../application/registroDeDomicilios";
import { comoDomicilioId, comoLugarId } from "../domain";
import {
  construirHrefDeDomicilios,
  hrefDeDomicilioDelRegistro,
  hrefDeVerMasDeDomicilios,
  hrefSinFiltroDeDomicilios,
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

describe("hrefDeDomicilioDelRegistro", () => {
  const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
  const domicilio = {
    id: comoDomicilioId("55555555-5555-4555-8555-555555555555"),
    lugarId: coloniaId,
  };
  const destino = (raiz: string) =>
    `/territorio?raiz=${raiz}&nodo=${coloniaId}&vista=domicilios&domicilio=${domicilio.id}#panel-de-domicilio`;

  it("usa el asentamiento del filtro como raiz", () => {
    expect(
      hrefDeDomicilioDelRegistro(domicilio, {
        filtros: { raizId: cabeceraId },
        raices: [],
      }),
    ).toBe(destino(cabeceraId));
  });

  it("si el lugar es un asentamiento, el es la raiz", () => {
    expect(
      hrefDeDomicilioDelRegistro(
        { ...domicilio, lugarId: cabeceraId },
        { filtros: {}, raices: [cabeceraId] },
      ),
    ).toBe(
      `/territorio?raiz=${cabeceraId}&nodo=${cabeceraId}&vista=domicilios&domicilio=${domicilio.id}#panel-de-domicilio`,
    );
  });

  it("sin raiz conocida no inventa un enlace", () => {
    expect(
      hrefDeDomicilioDelRegistro(domicilio, { filtros: {}, raices: [] }),
    ).toBeUndefined();
  });
});

describe("hrefSinFiltroDeDomicilios", () => {
  const filtros = { raizId: cabeceraId, calle: "Calle 21", numero: "5" };

  it("quita solo el filtro nombrado y descarta el limite", () => {
    expect(hrefSinFiltroDeDomicilios(filtros, "calle")).toBe(
      `/territorio/domicilios?numero=5&raiz=${cabeceraId}`,
    );
    expect(hrefSinFiltroDeDomicilios(filtros, "numero")).toBe(
      `/territorio/domicilios?q=Calle+21&raiz=${cabeceraId}`,
    );
    expect(hrefSinFiltroDeDomicilios(filtros, "raizId")).toBe(
      "/territorio/domicilios?q=Calle+21&numero=5",
    );
  });
});
