import { describe, expect, it } from "vitest";
import { AREAS_RESPONSABLES } from "./areaResponsable";

describe("AREAS_RESPONSABLES", () => {
  it("es la union cerrada de los seis valores de la decision 3", () => {
    expect(AREAS_RESPONSABLES).toEqual([
      "OBRAS_PUBLICAS",
      "ALUMBRADO_PUBLICO",
      "AGUA_POTABLE_Y_DRENAJE",
      "LIMPIA_Y_RECOLECCION",
      "PARQUES_Y_JARDINES",
      "SERVICIOS_GENERALES",
    ]);
  });
});
