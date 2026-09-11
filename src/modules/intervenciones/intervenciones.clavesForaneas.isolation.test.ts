import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeCalle, altaDeLugar, type LugarId } from "@/modules/territorio";
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
import { intervenciones } from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones, movimientos_de_reportes, reportes, folios_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: "motul" | "ticul", nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const calleDe = async (
  municipio: "motul" | "ticul",
  lugarId: LugarId,
  nombre: string,
) => {
  const { id } = await altaDeCalle(
    { nombre, lugarId },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = (
  lugarId: string,
  opciones: { calleId?: string | null; reporteId?: string | null } = {},
) =>
  withTenant(motul, (tx) =>
    tx.insert(intervenciones).values(
      intervencionDe({
        ayuntamientoId: motul,
        lugarId,
        calleId: opciones.calleId,
        reporteId: opciones.reporteId,
        registradoPorUsuarioId: gente.motul.OPERADOR,
      }),
    ),
  );

describe("FK compuestos de intervenciones", () => {
  it("rechaza un lugarId de otro municipio en Postgres", async () => {
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul FK Lugar");

    const motivoAjeno = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(intervenciones).values(
          intervencionDe({
            ayuntamientoId: motul,
            lugarId: lugarTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
          }),
        ),
      ),
    );

    expect(motivoAjeno).toMatch(/intervenciones_lugar_tenant_fk/i);
  });

  it("rechaza un calleId de otro municipio en Postgres", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul FK Calle");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul FK Calle");
    const calleTicul = await calleDe("ticul", lugarTicul, "Calle Ticul FK");

    const motivo = await motivoDeFalla(() =>
      insertar(lugarMotul, { calleId: calleTicul }),
    );

    expect(motivo).toMatch(/intervenciones_calle_tenant_fk/i);
  });

  it("rechaza un reporteId de otro municipio en Postgres", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul FK Reporte");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul FK Reporte");
    const filas = await withTenant(ticul, (tx) =>
      tx.execute<{ id: string }>(sql`
        INSERT INTO reportes (
          ayuntamiento_id, folio, anio, consecutivo, tipo, estado, lugar_id,
          descripcion, registrado_por_usuario_id
        ) VALUES (
          ${ticul}, 'REP-INTERVENCION-FK', 2026, 1, 'BACHE', 'RECIBIDO',
          ${lugarTicul}, 'Reporte de prueba', ${gente.ticul.OPERADOR}
        )
        RETURNING id
      `),
    );

    const reporteId = filas[0]?.id;
    if (!reporteId) throw new Error("No se pudo sembrar el reporte de prueba.");

    const motivo = await motivoDeFalla(() =>
      insertar(lugarMotul, { reporteId }),
    );

    expect(motivo).toMatch(/intervenciones_reporte_tenant_fk/i);
  });
});
