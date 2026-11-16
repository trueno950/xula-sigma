import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { agregarMapa } from "./composicion";
import { cajaDePuntos } from "./domain";
import {
  PUNTO_A,
  PUNTO_B,
  sembrarTerritorioDelMapa,
  type TerritorioDelMapa,
} from "./territorioDelMapaDePrueba";

/**
 * Contra Postgres real: el recorte por territorio del mapa cruza cuatro
 * modulos, y lo garantizan RLS y el subarbol de `territorio`, no un puerto
 * mockeado. Cubre ademas la caja de la vista, que sale de las mismas calles
 * que RLS dejo leer.
 */

let gente: GentePorMunicipio;
let t: TerritorioDelMapa;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  t = await sembrarTerritorioDelMapa(gente);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const contexto = (municipio: "motul" | "ticul") =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const idsDe = (
  mapa: Awaited<ReturnType<typeof agregarMapa>>,
): readonly string[] =>
  [
    ...mapa.marcadores.flatMap((marcador) => marcador.hechos),
    ...mapa.cobertura,
  ].map((hecho) => String(hecho.id));

describe("agregarMapa, contra Postgres real", () => {
  it("sin territorio elegido trae los hechos del municipio y ninguno ajeno", async () => {
    const mapa = await agregarMapa(contexto("motul"), {});

    expect(idsDe(mapa)).toEqual(
      expect.arrayContaining([
        t.reporteDeA,
        t.reporteDeLaColonia,
        t.reporteDeB,
        t.intervencionDeB,
      ]),
    );
    expect(idsDe(mapa)).not.toContain(t.reporteAjeno);
    expect(mapa.caja).toEqual(cajaDePuntos([PUNTO_A, PUNTO_B]));
    expect(mapa.territorios.map((territorio) => territorio.id)).toEqual(
      expect.arrayContaining([t.comisariaA, t.comisariaB]),
    );
  });

  it("elegir una comisaria deja solo su subarbol, colonia incluida", async () => {
    const mapa = await agregarMapa(contexto("motul"), { lugar: t.comisariaA });

    expect(idsDe(mapa)).toEqual(
      expect.arrayContaining([t.reporteDeA, t.reporteDeLaColonia]),
    );
    expect(idsDe(mapa)).not.toContain(t.reporteDeB);
    expect(idsDe(mapa)).not.toContain(t.reporteAjeno);
    expect(mapa.caja).toEqual(cajaDePuntos([PUNTO_A]));
    expect(mapa.territorioElegido).toMatchObject({ id: t.comisariaA });
  });

  it("la caja de la otra comisaria no incluye las calles de la primera", async () => {
    const mapa = await agregarMapa(contexto("motul"), { lugar: t.comisariaB });

    expect(idsDe(mapa)).toEqual(
      expect.arrayContaining([t.reporteDeB, t.intervencionDeB]),
    );
    expect(idsDe(mapa)).not.toContain(t.reporteDeA);
    expect(mapa.caja).toEqual(cajaDePuntos([PUNTO_B]));
  });

  it("dos hechos sobre la misma calle comparten un marcador agrupado", async () => {
    const mapa = await agregarMapa(contexto("motul"), { lugar: t.comisariaB });

    expect(mapa.marcadores).toHaveLength(1);
    expect(
      (mapa.marcadores[0]?.hechos ?? [])
        .map((hecho) => String(hecho.id))
        .sort(),
    ).toEqual([String(t.intervencionDeB), String(t.reporteDeB)].sort());
    expect(
      mapa.leyenda.tipos.map((entrada) => `${entrada.tipo}:${entrada.conteo}`),
    ).toEqual(["BACHE:1", "OBRA:1"]);
  });

  it("un lugar de otro municipio no muestra ningun hecho", async () => {
    const mapa = await agregarMapa(contexto("motul"), {
      lugar: t.comisariaAjena,
    });

    expect(idsDe(mapa)).toEqual([]);
    expect(mapa.caja).toBeNull();
    expect(mapa.estado).toBe("VACIO");
  });

  it("un lugar inexistente tampoco", async () => {
    const mapa = await agregarMapa(contexto("motul"), {
      lugar: "99999999-9999-4999-8999-999999999999",
    });

    expect(idsDe(mapa)).toEqual([]);
    expect(mapa.caja).toBeNull();
  });
});
