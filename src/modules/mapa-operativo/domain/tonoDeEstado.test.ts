import { describe, expect, it } from "vitest";
import { tonoDeEstado } from "./tonoDeEstado";

/**
 * S4: la insignia de cada hecho lleva la palabra del estado, y el tono es lo
 * unico que la distingue de un vistazo. El mapeo vive en el servidor, igual
 * que el color: el cliente no elige como se ve un estado.
 */
describe("tonoDeEstado", () => {
  it("da un tono propio a cada estado del vocabulario, sin que el color vaya solo", () => {
    expect(tonoDeEstado("RECIBIDO")).toBe("neutro");
    expect(tonoDeEstado("EN_ATENCION")).toBe("aviso");
    expect(tonoDeEstado("RESUELTO")).toBe("exito");
    expect(tonoDeEstado("RECHAZADO")).toBe("error");
    expect(tonoDeEstado("PLANIFICADA")).toBe("neutro");
    expect(tonoDeEstado("EN_EJECUCION")).toBe("aviso");
    expect(tonoDeEstado("FINALIZADA")).toBe("exito");
    expect(tonoDeEstado("CANCELADA")).toBe("error");
  });

  it("un estado que el mapa no conoce no hereda el tono de otro", () => {
    expect(tonoDeEstado("INVENTADO")).toBe("neutro");
  });
});
