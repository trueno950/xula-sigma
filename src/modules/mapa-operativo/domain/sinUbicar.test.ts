import { describe, expect, it } from "vitest";
import {
  agruparCallesSinUbicar,
  contarSinUbicar,
  hrefDeUbicacion,
} from "./sinUbicar";

const COMISARIA = "11111111-1111-4111-8111-111111111111";
const COLONIA = "22222222-2222-4222-8222-222222222222";
const OTRA = "33333333-3333-4333-8333-333333333333";

const calle = (parcial: {
  calleId: string;
  calleNombre: string;
  raizId?: string;
  raizNombre?: string;
  lugarId?: string;
}) => ({
  calleId: parcial.calleId,
  calleNombre: parcial.calleNombre,
  lugarId: parcial.lugarId ?? COLONIA,
  raizId: parcial.raizId ?? COMISARIA,
  raizNombre: parcial.raizNombre ?? "Comisaría de Kinchil",
});

describe("hrefDeUbicacion", () => {
  it("abre el registro territorial en la calle, con la accion de ubicar", () => {
    expect(
      hrefDeUbicacion({
        raizId: COMISARIA,
        lugarId: COLONIA,
        calleId: "calle-1",
      }),
    ).toBe(
      `/territorio?raiz=${COMISARIA}&nodo=${COLONIA}&vista=calles&accion=ubicarCalle&calle=calle-1`,
    );
  });
});

describe("agruparCallesSinUbicar", () => {
  it("agrupa por territorio y arma el enlace de cada calle", () => {
    const grupos = agruparCallesSinUbicar({
      calles: [
        calle({ calleId: "calle-1", calleNombre: "Calle 20" }),
        calle({ calleId: "calle-2", calleNombre: "Calle 21" }),
      ],
      permitidos: null,
    });

    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.calles.map((una) => una.nombre)).toEqual([
      "Calle 20",
      "Calle 21",
    ]);
    expect(grupos[0]?.calles[0]?.href).toContain(`calle=calle-1`);
    expect(grupos[0]?.calles[0]?.href).toContain(`raiz=${COMISARIA}`);
  });

  it("dos territorios son dos renglones, ordenados por nombre", () => {
    const grupos = agruparCallesSinUbicar({
      calles: [
        calle({
          calleId: "calle-b",
          calleNombre: "Calle 5",
          raizId: OTRA,
          raizNombre: "Ticul",
        }),
        calle({ calleId: "calle-a", calleNombre: "Calle 20" }),
      ],
      permitidos: null,
    });

    expect(grupos.map((grupo) => grupo.nombre)).toEqual([
      "Comisaría de Kinchil",
      "Ticul",
    ]);
  });

  it("con un territorio elegido solo queda ese: el resto del municipio no se cuela", () => {
    const grupos = agruparCallesSinUbicar({
      calles: [
        calle({ calleId: "calle-a", calleNombre: "Calle 20" }),
        calle({
          calleId: "calle-b",
          calleNombre: "Calle 5",
          raizId: OTRA,
          raizNombre: "Ticul",
        }),
      ],
      permitidos: new Set([COMISARIA, COLONIA]),
    });

    expect(grupos.map((grupo) => grupo.id)).toEqual([COMISARIA]);
    expect(grupos[0]?.calles.map((una) => una.nombre)).toEqual(["Calle 20"]);
  });

  it("sin calles sin ubicar no hay renglones", () => {
    expect(agruparCallesSinUbicar({ calles: [], permitidos: null })).toEqual(
      [],
    );
  });
});

/**
 * S6: la pestana "Sin ubicar (N)" y el resumen cuentan lo mismo que se ve
 * adentro: las calles sin punto mas los hechos que no se pueden dibujar. Dos
 * cuentas distintas para el mismo numero es la forma de que la pestana diga 5
 * y la lista tenga 4.
 */
describe("contarSinUbicar", () => {
  it("suma las calles sin punto de cada territorio y los hechos sin dibujar", () => {
    const grupos = agruparCallesSinUbicar({
      calles: [
        calle({ calleId: "calle-1", calleNombre: "Calle 20" }),
        calle({ calleId: "calle-2", calleNombre: "Calle 22" }),
      ],
      permitidos: null,
    });

    expect(contarSinUbicar({ territorios: grupos, hechos: 2 })).toBe(4);
  });

  it("sin calles ni hechos pendientes cuenta cero", () => {
    expect(contarSinUbicar({ territorios: [], hechos: 0 })).toBe(0);
  });
});
