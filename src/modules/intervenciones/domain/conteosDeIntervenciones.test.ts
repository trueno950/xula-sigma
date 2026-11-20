import { describe, expect, it } from "vitest";
import { componerConteosDeIntervenciones } from "./conteosDeIntervenciones";

describe("componerConteosDeIntervenciones", () => {
  it("completa en cero el estado que no tiene filas", () => {
    const conteos = componerConteosDeIntervenciones([
      { estado: "EN_EJECUCION", conteo: 2 },
      { estado: "CANCELADA", conteo: 1 },
    ]);

    expect(conteos.porEstado).toEqual({
      PLANIFICADA: 0,
      EN_EJECUCION: 2,
      FINALIZADA: 0,
      CANCELADA: 1,
    });
    expect(conteos.total).toBe(3);
  });

  it("sin filas deja los cuatro estados en cero y el total en cero", () => {
    expect(componerConteosDeIntervenciones([])).toEqual({
      porEstado: {
        PLANIFICADA: 0,
        EN_EJECUCION: 0,
        FINALIZADA: 0,
        CANCELADA: 0,
      },
      total: 0,
    });
  });

  it("el total es la suma de los cuatro estados, no la cantidad de filas", () => {
    const conteos = componerConteosDeIntervenciones([
      { estado: "PLANIFICADA", conteo: 7 },
      { estado: "EN_EJECUCION", conteo: 2 },
      { estado: "FINALIZADA", conteo: 2 },
      { estado: "CANCELADA", conteo: 2 },
    ]);

    expect(conteos.total).toBe(13);
  });
});
