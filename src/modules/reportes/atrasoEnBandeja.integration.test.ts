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
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearListarReportes } from "./application/listarReportes";
import { registrarReporte } from "./composicion";
import type { ReporteId } from "./domain";
import { reportes } from "./infrastructure/esquema";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * El filtro «solo atrasados» de la bandeja, contra Postgres real: la
 * comparacion de fecha civil la hace Postgres (`AT TIME ZONE`), no una
 * resta de milisegundos en JavaScript, asi que la unica forma de probarla
 * es con la base. Los bordes del umbral -N dias, N-1- son unitarios
 * (`domain/umbralDeAtraso.test.ts`).
 */

let gente: GentePorMunicipio;
let lugarId: string;
let folio = 0;

const listarReportes = crearListarReportes(repositorioDeReportesSql);

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") =>
  contextoDe(gente, "motul", rol);

const reporteRegistradoEn = async (instante: string): Promise<ReporteId> => {
  folio += 1;
  const id = await registrarReporte(
    {
      tipo: "BACHE",
      referencia: null,
      descripcion: `Bache de prueba ${folio}`,
      personaId: null,
      lugarId,
      calleId: null,
    },
    contexto("OPERADOR"),
  );

  await withTenant(motul, (tx) =>
    tx
      .update(reportes)
      .set({ registradoEn: new Date(instante) })
      .where(eq(reportes.id, id)),
  );

  return id;
};

const foliosDe = async (atrasadosDesde: string | undefined) => {
  const { reportes: filas } = await listarReportes(
    atrasadosDesde === undefined ? {} : { atrasadosDesde },
    contexto("OPERADOR"),
  );
  return filas.map((reporte) => reporte.id).sort();
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre: "Comisaria del umbral", padreId: null },
    contexto("ADMIN_MUNICIPAL"),
  );
  lugarId = id;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("filtro «solo atrasados» de la bandeja", () => {
  it("deja pasar solo lo que ya cumplio el umbral, y sin filtro estan todos", async () => {
    const viejo = await reporteRegistradoEn("2026-11-10T18:00:00Z");
    const nuevo = await reporteRegistradoEn("2026-11-23T18:00:00Z");

    await expect(foliosDe(undefined)).resolves.toEqual([viejo, nuevo].sort());
    await expect(foliosDe("2026-11-17")).resolves.toEqual([viejo]);
  });

  it("un reporte que ya se atendio no es atrasado aunque tenga meses", async () => {
    const atendido = await reporteRegistradoEn("2026-06-01T18:00:00Z");
    await withTenant(motul, (tx) =>
      tx
        .update(reportes)
        .set({ estado: "EN_ATENCION" })
        .where(eq(reportes.id, atendido)),
    );

    await expect(foliosDe("2026-11-17")).resolves.not.toContain(atendido);
  });

  it("la fecha civil es la de Merida: las 23:00 del dia anterior no cuentan como el dia siguiente", async () => {
    // 05:00 UTC del 17 son las 23:00 del 16 en Merida (UTC-6).
    const enMeridaEl16 = await reporteRegistradoEn("2026-11-17T05:00:00Z");

    await expect(foliosDe("2026-11-16")).resolves.toContain(enMeridaEl16);
    await expect(foliosDe("2026-11-15")).resolves.not.toContain(enMeridaEl16);
  });
});
