import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarEstadoDeReporte } from "./application/cambiarEstadoDeReporte";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { folioDe } from "./folioDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * El operador indica el original de un duplicado por el folio que ve en
 * pantalla. Cada municipio numera desde 1, asi que el mismo texto existe en
 * los dos: lo que se prueba es que se resuelve solo dentro del propio.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const actor = (municipio: Municipio) =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});

const cambiarEstadoDeReporte = crearCambiarEstadoDeReporte({
  repositorio: repositorioDeReportesSql,
  movimientos: registroDeMovimientosSql,
});

const nuevoReporteEn = async (municipio: Municipio, lugarId: string) =>
  registrarReporte(
    {
      tipo: "BACHE",
      lugarId,
      calleId: null,
      referencia: null,
      descripcion: "Bache grande frente al parque principal",
      personaId: null,
    },
    actor(municipio),
  );

const lugarEn = async (municipio: Municipio) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre: `Comisaria ${municipio}`, padreId: null },
    actor(municipio),
  );
  return id;
};

const rechazarComoDuplicado = (
  id: Awaited<ReturnType<typeof nuevoReporteEn>>,
  folioDelOriginal: string,
) =>
  cambiarEstadoDeReporte(
    {
      id,
      estadoNuevo: "RECHAZADO",
      motivoDeRechazo: "DUPLICADO",
      folioDelOriginal,
    },
    actor("motul"),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, folios_de_reportes, reportes, movimientos_de_reportes, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("duplicado indicado por folio", () => {
  it("el folio de un reporte del mismo municipio queda vinculado por su id", async () => {
    const lugarId = await lugarEn("motul");
    const original = await nuevoReporteEn("motul", lugarId);
    const duplicado = await nuevoReporteEn("motul", lugarId);

    await rechazarComoDuplicado(duplicado, await folioDe(motul, original));

    const guardado = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, duplicado),
    );
    expect(guardado?.duplicadoDeReporteId).toBe(original);
    expect(guardado?.estado).toBe("RECHAZADO");
  });

  it("el folio de otro municipio y un folio inexistente fallan igual y no escriben nada", async () => {
    const lugarMotul = await lugarEn("motul");
    const lugarTicul = await lugarEn("ticul");
    const duplicado = await nuevoReporteEn("motul", lugarMotul);
    await nuevoReporteEn("ticul", lugarTicul);
    const ajeno = await nuevoReporteEn("ticul", lugarTicul);
    const folioAjeno = await folioDe(ticul, ajeno);

    const deOtroMunicipio = await rechazarComoDuplicado(
      duplicado,
      folioAjeno,
    ).catch((error: unknown) => error);
    const inexistente = await rechazarComoDuplicado(
      duplicado,
      "REP-2026-000999",
    ).catch((error: unknown) => error);

    expect(deOtroMunicipio).toBeInstanceOf(NoEncontradoError);
    expect(inexistente).toBeInstanceOf(NoEncontradoError);
    expect((deOtroMunicipio as Error).message).toBe(
      (inexistente as Error).message,
    );

    const guardado = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, duplicado),
    );
    expect(guardado?.estado).toBe("RECIBIDO");
    expect(guardado?.duplicadoDeReporteId).toBeNull();
  });
});
