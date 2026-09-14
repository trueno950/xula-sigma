import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  puedeAdministrarIntervenciones,
  puedeEscribir,
} from "@/shared/auth/roles";
import { NoEncontradoError } from "@/shared/lib/errores";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRegistrarIntervencion } from "./application/registrarIntervencion";
import {
  crearLectorDeReportesPorReportes,
  repositorioDeIntervencionesSql,
} from "./infrastructure";
import { intervenciones } from "./infrastructure/esquema";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registrarReporteDePrueba } from "./reporteVinculadoDePrueba";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, reportes, movimientos_de_reportes, folios_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registrar = crearRegistrarIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportes: crearLectorDeReportesPorReportes,
});
const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const trazasDeRegistro = () =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "REGISTRAR_INTERVENCION")),
  );

describe("registro real de intervenciones", () => {
  it("permite a OPERADOR registrar por puedeEscribir sin administrar", async () => {
    const contexto = contextoDe(gente, "motul", "OPERADOR");
    const lugarId = await lugarDe("Comisaria Registro Intervencion");

    expect(puedeEscribir(contexto.usuario.rol)).toBe(true);
    expect(puedeAdministrarIntervenciones(contexto.usuario.rol)).toBe(false);

    const id = await registrar(
      {
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque municipal",
      },
      contexto,
    );

    const guardada = await withTenant(motul, (tx) =>
      repositorioDeIntervencionesSql.buscarPorId(tx, id),
    );
    const trazas = await withTenant(motul, (tx) =>
      tx
        .select({ accion: bitacora.accion, entidadId: bitacora.entidadId })
        .from(bitacora)
        .where(eq(bitacora.entidadId, id)),
    );

    expect(guardada).toMatchObject({
      id,
      tipo: "OBRA",
      estado: "PLANIFICADA",
      fechaDeOcurrencia: "2026-01-15",
      lugarId,
      calleId: null,
      reporteId: null,
      registradoPorUsuarioId: contexto.usuario.id,
    });
    expect(guardada?.capturadoEn).toBeInstanceOf(Date);
    expect(trazas).toEqual([
      { accion: "REGISTRAR_INTERVENCION", entidadId: id },
    ]);
  });

  it("rechaza una ubicacion inexistente antes de insertar", async () => {
    await expect(
      registrar(
        {
          tipo: "BACHE",
          fechaDeOcurrencia: "2026-01-15",
          lugarId: "99999999-9999-4999-8999-999999999999",
          calleId: null,
          reporteId: null,
          descripcion: "Bache grande frente al parque principal",
        },
        contextoDe(gente, "motul", "OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza el reporte de otro municipio sin escribir intervencion ni bitacora", async () => {
    const lugarMotul = await lugarDe("Comisaria Registro Reporte Ajeno");
    const { id: lugarTicul } = await altaDeLugar(
      { tipo: "comisaria", nombre: "Comisaria Reporte Ticul", padreId: null },
      contextoDe(gente, "ticul", "ADMIN_MUNICIPAL"),
    );
    const reporteId = await registrarReporteDePrueba(
      lugarTicul,
      contextoDe(gente, "ticul", "OPERADOR"),
    );
    const trazasAntes = await trazasDeRegistro();

    await expect(
      registrar(
        {
          tipo: "OBRA",
          fechaDeOcurrencia: "2026-01-15",
          lugarId: lugarMotul,
          calleId: null,
          reporteId,
          descripcion: "Rehabilitacion del parque municipal",
        },
        contextoDe(gente, "motul", "OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(intervenciones),
    );
    const trazas = await trazasDeRegistro();
    expect(filas).toHaveLength(0);
    expect(trazas).toHaveLength(trazasAntes.length);
  });

  it("rechaza un reporte inexistente sin escribir intervencion ni bitacora", async () => {
    const lugarId = await lugarDe("Comisaria Registro Reporte Inexistente");
    const trazasAntes = await trazasDeRegistro();

    await expect(
      registrar(
        {
          tipo: "OBRA",
          fechaDeOcurrencia: "2026-01-15",
          lugarId,
          calleId: null,
          reporteId: "55555555-5555-4555-8555-555555555555",
          descripcion: "Rehabilitacion del parque municipal",
        },
        contextoDe(gente, "motul", "OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(intervenciones),
    );
    const trazas = await trazasDeRegistro();
    expect(filas).toHaveLength(0);
    expect(trazas).toHaveLength(trazasAntes.length);
  });
});
