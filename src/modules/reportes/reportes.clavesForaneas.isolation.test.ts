import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { reportes } from "./infrastructure/esquema";
import { reporteDe } from "./reporteDePrueba";

/**
 * Los cuatro FK compuestos cruzados: `lugarId`, `calleId`, `personaId` y
 * `duplicadoDeReporteId` de un municipio ajeno, insertados desde el propio,
 * tienen que ser rechazados por Postgres -- el limite lo pone la base, no la
 * aplicacion. Mismo mecanismo y fixtures que `reportes.isolation.test.ts`
 * (el aislamiento por RLS), archivo aparte por la metrica de lineas por
 * archivo (`AGENTS.md`).
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

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const calleDe = async (
  municipio: Municipio,
  lugarId: Awaited<ReturnType<typeof lugarDe>>,
  nombre: string,
) => {
  const { id } = await altaDeCalle(
    { nombre, lugarId },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const personaDe = async (municipio: Municipio, primerApellido: string) => {
  const { id } = await altaDePersona(
    { nombres: "Persona", primerApellido, segundoApellido: null, curp: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("FK compuestos de reportes", () => {
  it("un lugarId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Reportes 2");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000002",
            consecutivo: 2,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_lugar_tenant_fk/i);
  });

  it("un calleId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 3");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Reportes 3");
    const calleTicul = await calleDe("ticul", lugarTicul, "Calle Ticul 3");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            calleId: calleTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000003",
            consecutivo: 3,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_calle_tenant_fk/i);
  });

  it("un personaId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 4");
    const personaTicul = await personaDe("ticul", "Reportes4");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            personaId: personaTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000004",
            consecutivo: 4,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_persona_tenant_fk/i);
  });

  it("un duplicadoDeReporteId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 5");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Reportes 5");
    const [original] = await withTenant(ticul, (tx) =>
      tx
        .insert(reportes)
        .values(
          reporteDe({
            ayuntamientoId: ticul,
            lugarId: lugarTicul,
            registradoPorUsuarioId: gente.ticul.OPERADOR,
            folio: "REP-2026-000005",
            consecutivo: 5,
          }),
        )
        .returning({ id: reportes.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000006",
            consecutivo: 6,
            estado: "RECHAZADO",
            motivoDeRechazo: "DUPLICADO",
            duplicadoDeReporteId: original!.id,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_duplicado_tenant_fk/i);
  });
});
