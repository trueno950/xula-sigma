import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import { altaDeCalle, altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { UbicacionInvalidaError } from "./domain";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { reportes } from "./infrastructure/esquema";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";
import { reporteDe } from "./reporteDePrueba";

/**
 * `reportes/registro.integration.test.ts` (tasks.md 4.24-4.25): el vinculo
 * opcional con el padron -y su consecuencia, el reporte anonimo- y el
 * rechazo de un `lugarId`/`calleId` de otro municipio con
 * `UbicacionInvalidaError` -no un `23503` crudo-, mas el FK compuesto como
 * segunda reja a nivel base si se fuerza con SQL directo.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const actor = (municipio: Municipio, rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, municipio, rol);

const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});

const entrada = (
  lugarId: string,
  parcial: { personaId?: string; calleId?: string | null } = {},
) => ({
  tipo: "BACHE" as const,
  lugarId,
  calleId: parcial.calleId ?? null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: parcial.personaId ?? null,
});

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

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    actor(municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("el vinculo opcional con el padron", () => {
  it("registrar con persona del padron deja el vinculo escrito", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Registro Persona");
    const { id: personaId } = await altaDePersona(
      {
        nombres: "Vecina",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
      },
      admin,
    );

    const id = await registrarReporte(entrada(lugarId, { personaId }), admin);
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );

    expect(guardada?.personaId).toBe(personaId);
  });

  it("registrar sin persona deja el reporte anonimo, sin datos de contacto", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarId = await lugarDe("motul", "Comisaria Registro Anonimo");

    const id = await registrarReporte(entrada(lugarId), admin);
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );

    // La tabla no tiene columnas de nombre, telefono ni correo (decision
    // 11): lo unico que puede escribirse del reportante es el `personaId`.
    // El esquema lo fija y los tests de aislamiento de la Fase 3 lo probaron.
    expect(guardada?.personaId).toBeNull();
  });
});

describe("la ubicacion de otro municipio se rechaza dos veces", () => {
  it("un lugarId de otro municipio se rechaza con UbicacionInvalidaError, no con un 23503", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarTicul = await lugarDe("ticul", "Comisaria Registro Ajeno Lugar");

    await expect(
      registrarReporte(entrada(lugarTicul), admin),
    ).rejects.toBeInstanceOf(UbicacionInvalidaError);
  });

  it("un calleId de otro municipio se rechaza con UbicacionInvalidaError", async () => {
    const admin = actor("motul", "ADMIN_MUNICIPAL");
    const lugarMotul = await lugarDe("motul", "Comisaria Registro Ajeno Calle");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Registro Calle");
    const { id: calleTicul } = await altaDeCalle(
      { nombre: "Calle Ticul Registro", lugarId: lugarTicul },
      actor("ticul", "ADMIN_MUNICIPAL"),
    );

    await expect(
      registrarReporte(entrada(lugarMotul, { calleId: calleTicul }), admin),
    ).rejects.toBeInstanceOf(UbicacionInvalidaError);
  });

  it("un lugarId de otro municipio tambien es rechazado por el FK compuesto a nivel base", async () => {
    const lugarTicul = await lugarDe("ticul", "Comisaria Registro FK Lugar");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000001",
            consecutivo: 1,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_lugar_tenant_fk/i);
  });
});
