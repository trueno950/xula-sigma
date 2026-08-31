import { isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as superficie from "./index";

/**
 * Mismo mecanismo que `padron/superficiePublica.test.ts`: el objeto de
 * tabla no puede salir del barrel. Aca no lo justifica una fusion -no hay
 * ninguna todavia-, lo justifica que el CTE de subarbol y el indice
 * parcial de `residencias` son la unica implementacion correcta de esas
 * consultas, y un `.from(lugares)` desde otro modulo las esquiva
 * (design.md decision 3).
 */
describe("superficie publica de territorio", () => {
  it("no exporta ningun objeto de tabla Drizzle", () => {
    const tablas = Object.values(superficie).filter((valor) => isTable(valor));

    expect(tablas).toHaveLength(0);
  });

  /**
   * `direccionVigenteDePersona` es el caso de uso ya compuesto (tasks.md
   * 1.13), sin guarda de rol propia -la autorizacion la decide el
   * consumidor, mismo criterio que `personaPorId`-. El barrel lo tiene que
   * exponer como funcion invocable directamente, no como un objeto de
   * configuracion sin verificacion que un consumidor pueda confundir con
   * un caso de uso guardado.
   */
  it("exporta direccionVigenteDePersona como funcion", () => {
    expect(typeof superficie.direccionVigenteDePersona).toBe("function");
  });

  /**
   * `comoCalleId`/`CalleId` y `ubicacionDeLugar` los agrega la Fase 1 de
   * `reportes-ciudadanos` (tasks.md 1.9): `reportes` los necesita para
   * construir la ubicacion compuesta de un reporte sin domicilio.
   */
  it("exporta comoCalleId como funcion", () => {
    expect(typeof superficie.comoCalleId).toBe("function");
  });

  it("exporta ubicacionDeLugar como funcion, sin guarda de rol propia", () => {
    expect(typeof superficie.ubicacionDeLugar).toBe("function");
  });
});
