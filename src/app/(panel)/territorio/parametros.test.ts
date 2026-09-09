import { describe, expect, it } from "vitest";
import { comoLugarId } from "@/modules/territorio";
import { leerParametros, nodoResuelto } from "./parametros";

const RAIZ_AJENA = "11111111-1111-4111-8111-111111111111";
const LUGAR_ID = comoLugarId(RAIZ_AJENA);

describe("leerParametros", () => {
  it("lee raiz y nodo validos", () => {
    const parametros = leerParametros({ raiz: RAIZ_AJENA, nodo: RAIZ_AJENA });

    expect(parametros.raizId).toBe(RAIZ_AJENA);
  });

  /**
   * El caso que dejaba pasar un 200: `raiz` de otro municipio junto a un
   * `vista` que no es ninguna de las cuatro validas. Con el esquema
   * fallando entero, `raizId` volvia `undefined` y la pagina caia al
   * listado del municipio propio en vez de al 404 que la regla 8 exige
   * para una raiz ajena.
   */
  it("una raiz valida sobrevive aunque vista sea invalida", () => {
    const parametros = leerParametros({
      raiz: RAIZ_AJENA,
      vista: "invalida",
    });

    expect(parametros.raizId).toBe(RAIZ_AJENA);
  });

  it("una raiz valida sobrevive aunque accion sea invalida", () => {
    const parametros = leerParametros({
      raiz: RAIZ_AJENA,
      accion: "no-es-una-accion",
    });

    expect(parametros.raizId).toBe(RAIZ_AJENA);
  });

  it("una raiz valida sobrevive aunque calle sea invalida", () => {
    const parametros = leerParametros({ raiz: RAIZ_AJENA, calle: "xx" });

    expect(parametros.raizId).toBe(RAIZ_AJENA);
    expect(parametros.calleId).toBeUndefined();
  });

  it("un raiz que no es UUID cae a undefined, no rompe los demas campos", () => {
    const parametros = leerParametros({
      raiz: "../../otra-cosa",
      nodo: RAIZ_AJENA,
    });

    expect(parametros.raizId).toBeUndefined();
    expect(parametros.nodoId).toBe(RAIZ_AJENA);
  });

  it("una accion valida fija su propia pestana, ignorando vista", () => {
    const parametros = leerParametros({
      accion: "calle",
      vista: "domicilios",
    });

    expect(parametros.vista).toBe("calles");
  });

  it("lee una accion de calle y conserva su id para el panel", () => {
    const parametros = leerParametros({
      accion: "ubicarCalle",
      calle: RAIZ_AJENA,
      vista: "lugares",
    });

    expect(parametros.accion).toBe("ubicarCalle");
    expect(parametros.calleId).toBe(RAIZ_AJENA);
    expect(parametros.vista).toBe("calles");
  });

  it("sin accion, vista invalida cae al default de lugares", () => {
    const parametros = leerParametros({ vista: "invalida" });

    expect(parametros.vista).toBe("lugares");
  });
});

describe("nodoResuelto", () => {
  it("sin nodoId, la raiz es el lugar actual", () => {
    expect(
      nodoResuelto({
        raiz: { id: LUGAR_ID, tipo: "cabecera", nombre: "Motul" },
        nodos: [],
        nodoId: undefined,
      }),
    ).toEqual({ id: LUGAR_ID, tipo: "cabecera", nombre: "Motul" });
  });

  it("sin raiz, no hay nodo que resolver", () => {
    expect(
      nodoResuelto({ raiz: null, nodos: [], nodoId: LUGAR_ID }),
    ).toBeNull();
  });
});
