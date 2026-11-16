import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  contextoDelEscenario,
  type EscenarioDeLaBandeja,
  sembrarLaBandeja,
} from "./bandejaDelFiltroDePrueba";
import { buscarReportes, contarReportes, listarReportes } from "./composicion";

/**
 * S2 de `gestion-municipal` contra Postgres real: los filtros por lugar y por
 * area responsable de la bandeja, y los conteos por estado y por area para los
 * filtros elegidos. Los conteos los resuelve Postgres con `GROUP BY` bajo
 * `withTenant`; el aislamiento entre municipios lo garantiza RLS, no un
 * `WHERE` armado a mano.
 *
 * El escenario -comisaria de Motul con una colonia, comisaria de Ticul y un
 * reporte por lugar- se siembra una vez: los datos no cambian entre casos, asi
 * que cada uno afirma sobre el conjunto completo.
 */

let e: EscenarioDeLaBandeja;

const motul = () => contextoDelEscenario(e, "motul");
const ticul = () => contextoDelEscenario(e, "ticul");

const idsDe = async (
  resultado: Promise<Awaited<ReturnType<typeof listarReportes>>>,
): Promise<string[]> =>
  (await resultado).reportes.map((fila) => String(fila.id));

beforeAll(async () => {
  await sembrar();
  e = await sembrarLaBandeja();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("filtros por lugar y por area de la bandeja", () => {
  it("el lugar elegido trae su subarbol, y el area recorta ese conjunto", async () => {
    const subarbol = await idsDe(
      listarReportes({ lugarIds: [e.comisaria, e.colonia] }, motul()),
    );
    const soloColonia = await idsDe(
      listarReportes({ lugarIds: [e.colonia] }, motul()),
    );
    const deObras = await idsDe(
      listarReportes(
        { lugarIds: [e.comisaria, e.colonia], area: "OBRAS_PUBLICAS" },
        motul(),
      ),
    );

    expect(subarbol.sort()).toEqual(
      [e.enComisaria, e.enColonia, e.sinArea].sort(),
    );
    expect(soloColonia.sort()).toEqual([e.enColonia, e.sinArea].sort());
    expect(deObras).toEqual([e.enComisaria]);
  });

  it("un lugar de otro municipio no devuelve nada, ni siquiera con el filtro puesto", async () => {
    const resultado = await listarReportes(
      { lugarIds: [e.lugarAjeno] },
      motul(),
    );

    expect(resultado.reportes).toEqual([]);
    expect(
      await idsDe(listarReportes({ lugarIds: [e.lugarAjeno] }, motul())),
    ).not.toContain(e.ajeno);
  });

  it("el lugar tambien acota la busqueda de texto", async () => {
    const encontrados = await buscarReportes("Bache", motul(), {
      filtros: { lugarIds: [e.colonia] },
    });
    const sinCoincidencias = await buscarReportes("Luminaria", motul(), {
      filtros: { lugarIds: [e.colonia] },
    });

    expect(encontrados.reportes.map((fila) => String(fila.id)).sort()).toEqual(
      [e.enColonia, e.sinArea].sort(),
    );
    expect(sinCoincidencias.reportes).toEqual([]);
  });
});

describe("conteos por estado y por area para los filtros elegidos", () => {
  it("cuenta el subarbol del lugar elegido, con los ceros del catalogo", async () => {
    const conteos = await contarReportes(
      { filtros: { lugarIds: [e.colonia] } },
      motul(),
    );

    expect(conteos.porEstado).toEqual({
      RECIBIDO: 1,
      EN_ATENCION: 0,
      RESUELTO: 1,
      RECHAZADO: 0,
    });
    expect(conteos.porArea).toEqual([
      { area: "ALUMBRADO_PUBLICO", conteo: 1 },
      { area: null, conteo: 1 },
    ]);
    expect(conteos.total).toBe(2);
  });

  it("el area filtrada deja un solo renglon de area y el total coincide con las filas", async () => {
    const filtros = {
      lugarIds: [e.comisaria, e.colonia],
      area: "OBRAS_PUBLICAS" as const,
    };
    const conteos = await contarReportes({ filtros }, motul());
    const filas = await listarReportes(filtros, motul());

    expect(conteos.porArea).toEqual([
      { area: "OBRAS_PUBLICAS", conteo: filas.reportes.length },
    ]);
    expect(conteos.total).toBe(filas.reportes.length);
  });

  it("los conteos de una busqueda cuentan lo mismo que el listado", async () => {
    const filtros = { lugarIds: [e.comisaria, e.colonia] };
    const conteos = await contarReportes({ filtros, cadena: "Bache" }, motul());
    const filas = await buscarReportes("Bache", motul(), { filtros });

    expect(conteos.total).toBe(filas.reportes.length);
    expect(conteos.total).toBe(3);
  });

  it("cada municipio cuenta solo lo suyo", async () => {
    const ajenos = await contarReportes({}, ticul());
    const propios = await contarReportes({}, motul());

    expect(ajenos.total).toBe(1);
    expect(ajenos.porArea).toEqual([{ area: "OBRAS_PUBLICAS", conteo: 1 }]);
    expect(propios.total).toBe(3);
  });
});
