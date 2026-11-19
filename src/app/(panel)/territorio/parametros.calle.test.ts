import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

const RAIZ = "11111111-1111-4111-8111-111111111111";
const CALLE = "33333333-3333-4333-8333-333333333333";

/**
 * C1 de `odd/tasks/territorio-ux.md` (S7): un enlace a una calle caia en la
 * pestana Colonias y la calle no se abria, sin ningun aviso. El panel de la
 * calle solo existe en la pestana Calles, asi que el `?calle=` la implica.
 */
describe("leerParametros: la calle abierta implica la pestana Calles", () => {
  it("un ?calle= sin ?vista= abre Calles", () => {
    const parametros = leerParametros({ raiz: RAIZ, calle: CALLE });

    expect(parametros.calleId).toBe(CALLE);
    expect(parametros.vista).toBe("calles");
  });

  it("un ?calle= con ?vista=lugares tambien abre Calles", () => {
    const parametros = leerParametros({
      raiz: RAIZ,
      calle: CALLE,
      vista: "lugares",
    });

    expect(parametros.vista).toBe("calles");
  });

  it("una accion de la calle sigue fijando su pestana, y conserva su id", () => {
    const parametros = leerParametros({
      accion: "ubicarCalle",
      calle: CALLE,
      vista: "lugares",
    });

    expect(parametros.accion).toBe("ubicarCalle");
    expect(parametros.calleId).toBe(CALLE);
    expect(parametros.vista).toBe("calles");
  });

  it("sin calle, la vista pedida se respeta", () => {
    expect(leerParametros({ raiz: RAIZ, vista: "domicilios" }).vista).toBe(
      "domicilios",
    );
    expect(leerParametros({ raiz: RAIZ }).vista).toBe("lugares");
  });

  it("un calle invalida no cambia la pestana pedida", () => {
    const parametros = leerParametros({
      raiz: RAIZ,
      calle: "17-A",
      vista: "domicilios",
    });

    expect(parametros.calleId).toBeUndefined();
    expect(parametros.vista).toBe("domicilios");
  });
});
