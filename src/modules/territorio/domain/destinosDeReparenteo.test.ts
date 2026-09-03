import { describe, expect, it } from "vitest";
import { destinosDeReparenteo } from "./destinosDeReparenteo";
import type { LugarId } from "./identificadores";
import type { TipoDeLugar } from "./tipoDeLugar";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}` as LugarId;

const lugar = (n: number, tipo: TipoDeLugar) => ({ id: id(n), tipo });

const CABECERA = lugar(1, "cabecera");
const COMISARIA = lugar(2, "comisaria");
const COLONIA = lugar(3, "colonia");
const SECTOR = lugar(4, "sector");
const MANZANA = lugar(5, "manzana");

const CATALOGO = [CABECERA, COMISARIA, COLONIA, SECTOR, MANZANA];

describe("destinosDeReparenteo", () => {
  it("ofrece solo los lugares cuyo tipo puede contener al que se mueve", () => {
    expect(destinosDeReparenteo(MANZANA, CATALOGO)).toEqual([
      CABECERA,
      COMISARIA,
      COLONIA,
      SECTOR,
    ]);
  });

  it("no ofrece un lugar del mismo rango: nadie cuelga de un hermano", () => {
    expect(destinosDeReparenteo(COMISARIA, CATALOGO)).toEqual([]);
  });

  it("nunca se ofrece a si mismo", () => {
    const otraColonia = lugar(6, "colonia");

    expect(destinosDeReparenteo(COLONIA, [COLONIA, otraColonia])).toEqual([]);
  });

  it("conserva el orden del catalogo", () => {
    expect(destinosDeReparenteo(SECTOR, [COLONIA, CABECERA])).toEqual([
      COLONIA,
      CABECERA,
    ]);
  });

  /**
   * El caso que abrio esto: `norte`, una manzana suelta, se abria como raiz
   * de `/territorio`, y el formulario de mover recibia el subarbol de esa
   * misma raiz —vacio— en vez del catalogo del municipio.
   */
  it("con catalogo vacio no hay destino", () => {
    expect(destinosDeReparenteo(MANZANA, [])).toEqual([]);
  });
});
