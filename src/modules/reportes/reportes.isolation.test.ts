import { randomUUID } from "node:crypto";
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
import { comoReporteId } from "./domain";
import { reportes } from "./infrastructure/esquema";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin pasar por caso de uso -- la
 * Fase 4 todavia no existe. `lugarId`, `calleId` y `personaId` de prueba se
 * crean por la superficie publica real de `territorio` y `padron`
 * (`altaDeLugar`, `altaDeCalle`, `altaDePersona`), nunca por SQL directo
 * contra sus tablas -- esas son inalcanzables fuera de sus modulos
 * (design.md seccion 6), mismo criterio que `residencias.isolation.test.ts`.
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

const reporteDe = (opciones: {
  ayuntamientoId: typeof motul;
  lugarId: string;
  calleId?: string | null;
  personaId?: string | null;
  registradoPorUsuarioId: string;
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
  ayuntamientoId: opciones.ayuntamientoId,
  folio: opciones.folio,
  anio: 2026,
  consecutivo: opciones.consecutivo,
  tipo: "BACHE" as const,
  estado: opciones.estado ?? "RECIBIDO",
  lugarId: opciones.lugarId,
  calleId: opciones.calleId ?? null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: opciones.personaId ?? null,
  motivoDeRechazo: opciones.motivoDeRechazo ?? null,
  // `duplicadoDeReporteId` es el unico de los cuatro (`lugarId`, `calleId`,
  // `personaId`, `duplicadoDeReporteId`) que la columna tipa como
  // `ReporteId`: es un identificador del propio modulo, no de uno ajeno
  // (design.md seccion 3). Este test inserta directo con el objeto de
  // tabla, asi que necesita la marca que `application` recien exigiria en
  // la Fase 4.
  duplicadoDeReporteId: opciones.duplicadoDeReporteId
    ? comoReporteId(opciones.duplicadoDeReporteId)
    : null,
  registradoPorUsuarioId: opciones.registradoPorUsuarioId,
});

describe("aislamiento de reportes", () => {
  it("una consulta sin filtro solo devuelve los reportes del tenant activo", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 1");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Reportes 1");

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(reportes)
        .values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000001",
            consecutivo: 1,
          }),
        )
        .returning({ id: reportes.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(reportes).values(
        reporteDe({
          ayuntamientoId: ticul,
          lugarId: lugarTicul,
          registradoPorUsuarioId: gente.ticul.OPERADOR,
          folio: "REP-2026-000001",
          consecutivo: 1,
        }),
      ),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(reportes));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

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

  it("duplicado_de_reporte_id = id es rechazado por reportes_sin_autoduplicado", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 6");
    const id = comoReporteId(randomUUID());

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values({
          ...reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000007",
            consecutivo: 7,
            estado: "RECHAZADO",
            motivoDeRechazo: "DUPLICADO",
            duplicadoDeReporteId: id,
          }),
          id,
        }),
      ),
    );

    expect(motivo).toMatch(/reportes_sin_autoduplicado/i);
  });

  it("estado RECHAZADO sin motivoDeRechazo es rechazado por reportes_rechazo_completo", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 7");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2026-000008",
            consecutivo: 8,
            estado: "RECHAZADO",
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_rechazo_completo/i);
  });

  it(
    "motivoDeRechazo nulo con duplicadoDeReporteId presente es rechazado por " +
      "reportes_duplicado_con_motivo -- el caso exacto que `=` en vez de " +
      "`IS NOT DISTINCT FROM` dejaria pasar",
    async () => {
      const lugarMotul = await lugarDe("motul", "Comisaria Motul Reportes 8");
      const [original] = await withTenant(motul, (tx) =>
        tx
          .insert(reportes)
          .values(
            reporteDe({
              ayuntamientoId: motul,
              lugarId: lugarMotul,
              registradoPorUsuarioId: gente.motul.OPERADOR,
              folio: "REP-2026-000009",
              consecutivo: 9,
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
              folio: "REP-2026-000010",
              consecutivo: 10,
              duplicadoDeReporteId: original!.id,
            }),
          ),
        ),
      );

      expect(motivo).toMatch(/reportes_duplicado_con_motivo/i);
    },
  );
});
