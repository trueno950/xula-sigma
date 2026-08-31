import { randomUUID } from "node:crypto";
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
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { comoReporteId } from "./domain";
import { reportes } from "./infrastructure/esquema";

/**
 * Los tres CHECKs de negocio de `reportes` que no son de aislamiento:
 * autoduplicado, rechazo completo y duplicado-con-motivo. El aislamiento
 * por tenant esta en `reportes.isolation.test.ts` y los FK compuestos en
 * `reportes.clavesForaneas.isolation.test.ts`; archivo aparte por la
 * metrica de lineas por archivo (`AGENTS.md`), mismo mecanismo.
 */

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

const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const reporteDe = (opciones: {
  lugarId: string;
  folio: string;
  consecutivo: number;
  estado?: "RECIBIDO" | "EN_ATENCION" | "RESUELTO" | "RECHAZADO";
  motivoDeRechazo?:
    | "DUPLICADO"
    | "FUERA_DE_COMPETENCIA"
    | "INFORMACION_INSUFICIENTE"
    | null;
  duplicadoDeReporteId?: string | null;
}) => ({
  ayuntamientoId: motul,
  folio: opciones.folio,
  anio: 2026,
  consecutivo: opciones.consecutivo,
  tipo: "BACHE" as const,
  estado: opciones.estado ?? "RECIBIDO",
  lugarId: opciones.lugarId,
  calleId: null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
  motivoDeRechazo: opciones.motivoDeRechazo ?? null,
  duplicadoDeReporteId: opciones.duplicadoDeReporteId
    ? comoReporteId(opciones.duplicadoDeReporteId)
    : null,
  registradoPorUsuarioId: "",
});

describe("CHECKs de negocio de reportes", () => {
  it("duplicado_de_reporte_id = id es rechazado por reportes_sin_autoduplicado", async () => {
    const lugarMotul = await lugarDe("Comisaria Motul Reportes 6");
    const id = comoReporteId(randomUUID());

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values({
          ...reporteDe({
            lugarId: lugarMotul,
            folio: "REP-2026-000007",
            consecutivo: 7,
            estado: "RECHAZADO",
            motivoDeRechazo: "DUPLICADO",
            duplicadoDeReporteId: id,
          }),
          id,
          registradoPorUsuarioId: gente.motul.OPERADOR,
        }),
      ),
    );

    expect(motivo).toMatch(/reportes_sin_autoduplicado/i);
  });

  it("estado RECHAZADO sin motivoDeRechazo es rechazado por reportes_rechazo_completo", async () => {
    const lugarMotul = await lugarDe("Comisaria Motul Reportes 7");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values({
          ...reporteDe({
            lugarId: lugarMotul,
            folio: "REP-2026-000008",
            consecutivo: 8,
            estado: "RECHAZADO",
          }),
          registradoPorUsuarioId: gente.motul.OPERADOR,
        }),
      ),
    );

    expect(motivo).toMatch(/reportes_rechazo_completo/i);
  });

  it(
    "motivoDeRechazo nulo con duplicadoDeReporteId presente es rechazado por " +
      "reportes_duplicado_con_motivo -- el caso exacto que `=` en vez de " +
      "`IS NOT DISTINCT FROM` dejaria pasar",
    async () => {
      const lugarMotul = await lugarDe("Comisaria Motul Reportes 8");
      const [original] = await withTenant(motul, (tx) =>
        tx
          .insert(reportes)
          .values({
            ...reporteDe({
              lugarId: lugarMotul,
              folio: "REP-2026-000009",
              consecutivo: 9,
            }),
            registradoPorUsuarioId: gente.motul.OPERADOR,
          })
          .returning({ id: reportes.id }),
      );

      const motivo = await motivoDeFalla(() =>
        withTenant(motul, (tx) =>
          tx.insert(reportes).values({
            ...reporteDe({
              lugarId: lugarMotul,
              folio: "REP-2026-000010",
              consecutivo: 10,
              duplicadoDeReporteId: original!.id,
            }),
            registradoPorUsuarioId: gente.motul.OPERADOR,
          }),
        ),
      );

      expect(motivo).toMatch(/reportes_duplicado_con_motivo/i);
    },
  );
});
