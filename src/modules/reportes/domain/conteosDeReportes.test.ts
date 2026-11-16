import { describe, expect, it } from "vitest";
import { componerConteos } from "./conteosDeReportes";

/**
 * S2 de `gestion-municipal`: los conteos por estado y por area de la bandeja,
 * para los filtros elegidos. La base devuelve solo las filas que existen
 * -`GROUP BY` no inventa ceros-, y la pantalla necesita los cuatro estados
 * siempre: un estado en cero es informacion ("no hay nada rechazado"), no una
 * fila ausente.
 */
describe("componerConteos", () => {
  it("los cuatro estados aparecen siempre, con cero donde no hay filas", () => {
    const conteos = componerConteos({
      porEstado: [{ estado: "RECIBIDO", conteo: 3 }],
      porArea: [],
    });

    expect(conteos.porEstado).toEqual({
      RECIBIDO: 3,
      EN_ATENCION: 0,
      RESUELTO: 0,
      RECHAZADO: 0,
    });
    expect(conteos.total).toBe(3);
  });

  it("el total es la suma de los estados, no la de las areas", () => {
    const conteos = componerConteos({
      porEstado: [
        { estado: "RECIBIDO", conteo: 2 },
        { estado: "EN_ATENCION", conteo: 1 },
        { estado: "RECHAZADO", conteo: 4 },
      ],
      porArea: [],
    });

    expect(conteos.total).toBe(7);
  });

  it("las areas salen en el orden del catalogo, sin los ceros", () => {
    const conteos = componerConteos({
      porEstado: [],
      porArea: [
        { area: "SERVICIOS_GENERALES", conteo: 1 },
        { area: "OBRAS_PUBLICAS", conteo: 2 },
      ],
    });

    expect(conteos.porArea).toEqual([
      { area: "OBRAS_PUBLICAS", conteo: 2 },
      { area: "SERVICIOS_GENERALES", conteo: 1 },
    ]);
  });

  it("«Sin asignar» va al final, despues de las areas con nombre", () => {
    const conteos = componerConteos({
      porEstado: [],
      porArea: [
        { area: null, conteo: 5 },
        { area: "ALUMBRADO_PUBLICO", conteo: 1 },
      ],
    });

    expect(conteos.porArea).toEqual([
      { area: "ALUMBRADO_PUBLICO", conteo: 1 },
      { area: null, conteo: 5 },
    ]);
  });

  it("sin filas no hay areas y el total es cero", () => {
    const conteos = componerConteos({ porEstado: [], porArea: [] });

    expect(conteos.porArea).toEqual([]);
    expect(conteos.total).toBe(0);
  });
});
