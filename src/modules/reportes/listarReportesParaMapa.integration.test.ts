import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDeCalle, altaDeLugar } from "@/modules/territorio";
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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearListarReportesParaMapa } from "./application/listarReportesParaMapa";
import { reportes } from "./infrastructure/esquema";
import { lectorDeReportesDeMapaSql } from "./infrastructure/listadoDeReportesSql";
import { reporteDe } from "./reporteDePrueba";

/**
 * Contra Postgres real: que la lectura del mapa devuelva las filas del
 * tenant del contexto -incluidas las de `calleId` nulo- y que `descripcion`
 * y `referencia` no salgan por este camino. Un puerto mockeado no demuestra
 * ninguna de las dos: la primera la garantiza RLS y la segunda, la lista
 * explicita de columnas del adaptador.
 */

let gente: GentePorMunicipio;

const listarReportesParaMapa = crearListarReportesParaMapa(
  lectorDeReportesDeMapaSql,
);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

type Municipio = "motul" | "ticul";

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const calleDe = async (
  lugarId: Awaited<ReturnType<typeof lugarDe>>,
  nombre: string,
) => {
  const { id } = await altaDeCalle(
    { nombre, lugarId },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertarReporte = async (datos: {
  municipio: Municipio;
  lugarId: string;
  calleId?: string | null;
  folio: string;
  consecutivo: number;
}) => {
  const ayuntamientoId = datos.municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(reportes)
      .values(
        reporteDe({
          ayuntamientoId,
          lugarId: datos.lugarId,
          calleId: datos.calleId ?? null,
          registradoPorUsuarioId: gente[datos.municipio].OPERADOR,
          folio: datos.folio,
          consecutivo: datos.consecutivo,
        }),
      )
      .returning({ id: reportes.id }),
  );
  return fila?.id;
};

describe("listarReportesParaMapa, contra Postgres real", () => {
  it("devuelve la fila con calleId nulo sin descartarla", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Mapa Nulo");
    const reporteId = await insertarReporte({
      municipio: "motul",
      lugarId,
      calleId: null,
      folio: "REP-2026-000101",
      consecutivo: 101,
    });

    const filas = await listarReportesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const fila = filas.find((r) => r.id === reporteId);

    expect(fila).toMatchObject({ calleId: null, lugarId });
  });

  it("resuelve el calleId de una fila con calle", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Mapa Calle");
    const calleId = await calleDe(lugarId, "Calle del Mapa");
    const reporteId = await insertarReporte({
      municipio: "motul",
      lugarId,
      calleId,
      folio: "REP-2026-000102",
      consecutivo: 102,
    });

    const filas = await listarReportesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const fila = filas.find((r) => r.id === reporteId);

    expect(fila).toMatchObject({ calleId, lugarId });
  });

  it("no cruza municipios: un contexto de Motul no ve reportes de Ticul", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Mapa Motul");
    const lugarTicul = await lugarDe("ticul", "Comisaria Mapa Ticul");
    const deMotul = await insertarReporte({
      municipio: "motul",
      lugarId: lugarMotul,
      folio: "REP-2026-000103",
      consecutivo: 103,
    });
    const deTicul = await insertarReporte({
      municipio: "ticul",
      lugarId: lugarTicul,
      folio: "REP-2026-000103",
      consecutivo: 103,
    });

    const filas = await listarReportesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const ids = filas.map((fila) => fila.id);

    expect(ids).toContain(deMotul);
    expect(ids).not.toContain(deTicul);
  });

  it("no devuelve descripcion ni referencia, solo los seis campos contratados", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Mapa Protegidos");
    const reporteId = await insertarReporte({
      municipio: "motul",
      lugarId,
      folio: "REP-2026-000104",
      consecutivo: 104,
    });

    const filas = await listarReportesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const fila = filas.find((r) => r.id === reporteId);

    expect(Object.keys(fila ?? {}).sort()).toEqual([
      "calleId",
      "estado",
      "folio",
      "id",
      "lugarId",
      "tipo",
    ]);
    expect(fila).not.toHaveProperty("descripcion");
    expect(fila).not.toHaveProperty("referencia");
  });
});
