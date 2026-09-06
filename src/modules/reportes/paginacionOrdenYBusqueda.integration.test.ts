import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearBuscarReportes, crearListarReportes } from "./application";
import { crearRegistrarReporte } from "./application/registrarReporte";
import {
  contadorDeFoliosSql,
  crearLectorDeReportantesPorPadron,
  crearLectorDeUbicacionesPorTerritorio,
  registroDeMovimientosSql,
  repositorioDeReportesSql,
} from "./infrastructure";

/**
 * Contra Postgres real: que `limite` sea el `LIMIT` de la consulta y no un
 * recorte en memoria, que `orden` cambie el `ORDER BY` real, y que `buscar`
 * combine el `ILIKE` con `estado`/`tipo` -las tres cosas que un puerto
 * mockeado no puede demostrar (mismo criterio que
 * `padron/paginacionYOrden.integration.test.ts`).
 */

let gente: GentePorMunicipio;
let lugarId: string;

const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});
const listarReportes = crearListarReportes(repositorioDeReportesSql);
const buscarReportes = crearBuscarReportes(repositorioDeReportesSql);

/**
 * Token largo y distintivo en la descripcion, sin choque con otro dato del
 * tenant: una sola busqueda encuentra a los tres sin depender de que tan
 * parecida sea cada descripcion individual.
 */
const TOKEN_DE_BUSQUEDA = "xtestpaginacionreportes";

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();

  const contextoAlta = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
  const lugar = await altaDeLugar(
    {
      tipo: "comisaria",
      nombre: "Comisaria Reportes Paginacion",
      padreId: null,
    },
    contextoAlta,
  );
  lugarId = lugar.id;

  await registrarReporte(
    {
      tipo: "BACHE",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: `Primer reporte ${TOKEN_DE_BUSQUEDA}`,
      personaId: null,
    },
    contextoAlta,
  );
  await registrarReporte(
    {
      tipo: "FUGA",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: `Segundo reporte ${TOKEN_DE_BUSQUEDA}`,
      personaId: null,
    },
    contextoAlta,
  );
  await registrarReporte(
    {
      tipo: "BASURA",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: `Tercer reporte ${TOKEN_DE_BUSQUEDA}`,
      personaId: null,
    },
    contextoAlta,
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const contexto = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

describe("paginacion y orden, contra Postgres real", () => {
  it("limite es el LIMIT real: recorta y marca hayMas", async () => {
    const pagina = await listarReportes({}, contexto(), { limite: 2 });

    expect(pagina.reportes).toHaveLength(2);
    expect(pagina.hayMas).toBe(true);
  });

  it("con limite igual o mayor al total, hayMas es falso", async () => {
    const pagina = await listarReportes({}, contexto(), { limite: 50 });

    expect(pagina.reportes.length).toBeGreaterThanOrEqual(3);
    expect(pagina.hayMas).toBe(false);
  });

  it("sin orden pedido, el mas reciente primero", async () => {
    const pagina = await listarReportes({}, contexto(), { limite: 50 });
    const folios = pagina.reportes.map((r) => r.folio);

    expect(folios).toEqual([...folios].sort().reverse());
  });

  it("orden por folio asc invierte el default", async () => {
    const pagina = await listarReportes({}, contexto(), {
      limite: 50,
      orden: { campo: "folio", direccion: "asc" },
    });
    const folios = pagina.reportes.map((r) => r.folio);

    expect(folios).toEqual([...folios].sort());
  });
});

describe("buscarReportes, contra Postgres real", () => {
  it("encuentra por descripcion con ILIKE", async () => {
    const resultado = await buscarReportes(TOKEN_DE_BUSQUEDA, contexto());

    expect(resultado.reportes.length).toBeGreaterThanOrEqual(3);
  });

  it("tambien pagina: limite recorta y marca hayMas", async () => {
    const resultado = await buscarReportes(TOKEN_DE_BUSQUEDA, contexto(), {
      limite: 1,
    });

    expect(resultado.reportes).toHaveLength(1);
    expect(resultado.hayMas).toBe(true);
  });

  it("convive con los filtros: estado/tipo acotan la busqueda, no la reemplazan", async () => {
    const resultado = await buscarReportes(TOKEN_DE_BUSQUEDA, contexto(), {
      filtros: { tipo: "FUGA" },
    });

    expect(resultado.reportes.length).toBeGreaterThanOrEqual(1);
    expect(resultado.reportes.every((r) => r.tipo === "FUGA")).toBe(true);
  });

  it("una cadena sin coincidencias no devuelve nada", async () => {
    const resultado = await buscarReportes(
      "cadena-que-nunca-va-a-existir-en-ningun-reporte",
      contexto(),
    );

    expect(resultado.reportes).toHaveLength(0);
  });
});
