import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { movimientosDeReportes, reportes } from "./infrastructure/esquema";

/**
 * Tres invariantes: aislamiento por tenant (T1), el FK compuesto a mano
 * hacia `reportes`, y el permiso de solo-agregado -sin UPDATE ni DELETE-
 * que la migracion otorga (design.md seccion 6). El tercero se prueba
 * esperando el error de permiso, no leyendo el `.sql`, mismo mecanismo que
 * `shared/tenancy/bitacora.isolation.test.ts`.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const reporteDe = async (
  municipio: Municipio,
  nombreLugar: string,
  folio: string,
  consecutivo: number,
) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre: nombreLugar, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );

  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(reportes)
      .values({
        ayuntamientoId,
        folio,
        anio: 2026,
        consecutivo,
        tipo: "BACHE",
        estado: "RECIBIDO",
        lugarId,
        calleId: null,
        referencia: null,
        descripcion: "Bache frente a la plaza principal",
        personaId: null,
        motivoDeRechazo: null,
        duplicadoDeReporteId: null,
        registradoPorUsuarioId: gente[municipio].OPERADOR,
      })
      .returning({ id: reportes.id }),
  );

  return fila!.id;
};

describe("aislamiento de movimientos_de_reportes", () => {
  it("una consulta sin filtro solo devuelve los movimientos del tenant activo", async () => {
    const reporteMotul = await reporteDe(
      "motul",
      "Comisaria Motul Movimientos 1",
      "REP-2026-000001",
      1,
    );
    const reporteTicul = await reporteDe(
      "ticul",
      "Comisaria Ticul Movimientos 1",
      "REP-2026-000001",
      1,
    );

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(movimientosDeReportes)
        .values({
          ayuntamientoId: motul,
          reporteId: reporteMotul,
          usuarioId: gente.motul.OPERADOR,
          estadoAnterior: null,
          estadoNuevo: "RECIBIDO",
          areaAsignada: null,
          motivo: null,
        })
        .returning({ id: movimientosDeReportes.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(movimientosDeReportes).values({
        ayuntamientoId: ticul,
        reporteId: reporteTicul,
        usuarioId: gente.ticul.OPERADOR,
        estadoAnterior: null,
        estadoNuevo: "RECIBIDO",
        areaAsignada: null,
        motivo: null,
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(movimientosDeReportes),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("un reporteId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const reporteTicul = await reporteDe(
      "ticul",
      "Comisaria Ticul Movimientos 2",
      "REP-2026-000002",
      2,
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(movimientosDeReportes).values({
          ayuntamientoId: motul,
          reporteId: reporteTicul,
          usuarioId: gente.motul.OPERADOR,
          estadoAnterior: null,
          estadoNuevo: "RECIBIDO",
          areaAsignada: null,
          motivo: null,
        }),
      ),
    );

    expect(motivo).toMatch(/movimientos_de_reportes_reporte_tenant_fk/i);
  });

  it("un UPDATE sobre una fila propia espera error de permiso, no RLS", async () => {
    const reporteMotul = await reporteDe(
      "motul",
      "Comisaria Motul Movimientos 3",
      "REP-2026-000003",
      3,
    );
    const [fila] = await withTenant(motul, (tx) =>
      tx
        .insert(movimientosDeReportes)
        .values({
          ayuntamientoId: motul,
          reporteId: reporteMotul,
          usuarioId: gente.motul.OPERADOR,
          estadoAnterior: null,
          estadoNuevo: "RECIBIDO",
          areaAsignada: null,
          motivo: null,
        })
        .returning({ id: movimientosDeReportes.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx
          .update(movimientosDeReportes)
          .set({ estadoNuevo: "EN_ATENCION" })
          .where(eq(movimientosDeReportes.id, fila!.id)),
      ),
    );

    expect(motivo).toMatch(
      /permission denied for table movimientos_de_reportes/i,
    );
  });
});
