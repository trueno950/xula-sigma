import { describe, expect, it } from "vitest";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "../application/registroDeDomicilios";
import { comoLugarId } from "../domain";
import {
  conFiltrosDeLaPestana,
  hrefDeVerMasDeLaPestana,
} from "./hrefsDeLaPestana";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodoId = comoLugarId("22222222-2222-4222-8222-222222222222");
const ruta = `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=calles`;

describe("conFiltrosDeLaPestana", () => {
  it("sin busqueda ni limite deja la ruta como estaba", () => {
    expect(conFiltrosDeLaPestana(ruta, {})).toBe(ruta);
  });

  it("agrega la busqueda codificada y el limite", () => {
    expect(
      conFiltrosDeLaPestana(ruta, { busqueda: "20 & 22", limite: 100 }),
    ).toBe(`${ruta}&q=20+%26+22&limite=100`);
  });

  it("omite el limite cuando es la primera pagina", () => {
    expect(conFiltrosDeLaPestana(ruta, { limite: TAMANO_DE_PAGINA })).toBe(
      ruta,
    );
  });
});

describe("hrefDeVerMasDeLaPestana", () => {
  it("sin limite pide la segunda pagina y conserva la busqueda", () => {
    expect(
      hrefDeVerMasDeLaPestana({
        raizId,
        nodoId,
        vista: "calles",
        busqueda: "20",
      }),
    ).toBe(`${ruta}&q=20&limite=${TAMANO_DE_PAGINA * 2}`);
  });

  it("suma una pagina al limite vigente", () => {
    expect(
      hrefDeVerMasDeLaPestana({
        raizId,
        nodoId,
        vista: "domicilios",
        limite: 100,
      }),
    ).toBe(
      `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=domicilios&limite=150`,
    );
  });

  it("se queda en el tope en vez de pasarlo", () => {
    expect(
      hrefDeVerMasDeLaPestana({
        raizId,
        nodoId,
        vista: "calles",
        limite: LIMITE_MAXIMO - 10,
      }),
    ).toBe(`${ruta}&limite=${LIMITE_MAXIMO}`);
  });
});
