import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import type { FiltrosDeListado } from "./application/puertosDeListado";
import {
  contextoDelEscenario,
  type EscenarioDeLaBandeja,
  sembrarLaBandeja,
} from "./bandejaDelFiltroDePrueba";
import { contarReportes, listarReportes } from "./composicion";
import { ESTADOS_DE_REPORTE } from "./domain";

/**
 * S2 de `gestion-municipal`: los conteos de la bandeja tienen que decir
 * exactamente lo que las filas muestran. El listado y los conteos son dos
 * consultas distintas -una pagina y dos `GROUP BY`- con las mismas
 * condiciones, y esta sonda durable comprueba la igualdad por los tres
 * caminos: el total, el renglon de cada estado y el de cada area.
 *
 * Sondeo del verificador independiente, aparte de `filtrosYConteos` por la
 * metrica de lineas por archivo.
 */

let e: EscenarioDeLaBandeja;

const motul = () => contextoDelEscenario(e, "motul");

const leer = async (filtros: FiltrosDeListado) => {
  const [listado, conteos] = await Promise.all([
    listarReportes(filtros, motul()),
    contarReportes({ filtros }, motul()),
  ]);

  return { filas: listado.reportes, conteos };
};

beforeAll(async () => {
  await sembrar();
  e = await sembrarLaBandeja();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("los conteos igualan las filas del listado", () => {
  it("sin filtros: el total, cada estado y cada area coinciden con las filas", async () => {
    const { filas, conteos } = await leer({});

    expect(conteos.total).toBe(filas.length);
    for (const estado of ESTADOS_DE_REPORTE) {
      expect(conteos.porEstado[estado]).toBe(
        filas.filter((fila) => fila.estado === estado).length,
      );
    }
    expect(
      conteos.porArea.reduce((total, fila) => total + fila.conteo, 0),
    ).toBe(filas.length);
    for (const { area, conteo } of conteos.porArea) {
      expect(conteo).toBe(
        filas.filter((fila) => fila.areaResponsable === area).length,
      );
    }
  });

  it("area y lugar acotan las dos lecturas a la vez", async () => {
    const filtros = {
      lugarIds: [e.comisaria, e.colonia],
      area: "OBRAS_PUBLICAS" as const,
    };
    const { filas, conteos } = await leer(filtros);

    expect(filas).toHaveLength(1);
    expect(conteos.total).toBe(filas.length);
    expect(conteos.porArea).toEqual([
      { area: "OBRAS_PUBLICAS", conteo: filas.length },
    ]);
    expect(conteos.porEstado.RECIBIDO).toBe(1);
    expect(conteos.porEstado.RESUELTO).toBe(0);
  });

  it("un lugar de otro municipio da cero filas y cero conteos", async () => {
    const { filas, conteos } = await leer({ lugarIds: [e.lugarAjeno] });

    expect(filas).toEqual([]);
    expect(conteos.total).toBe(0);
    expect(Object.values(conteos.porEstado)).toEqual([0, 0, 0, 0]);
    expect(conteos.porArea).toEqual([]);
  });
});
