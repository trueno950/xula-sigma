import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async () => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre: "Comisaria Motul Checks", padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertarCon = (lugarId: string, tipo: string, estado: string) =>
  withTenant(motul, (tx) =>
    tx.execute(sql`
      INSERT INTO intervenciones (
        ayuntamiento_id, tipo, estado, fecha_de_ocurrencia, lugar_id,
        descripcion, registrado_por_usuario_id
      ) VALUES (
        ${motul}, ${tipo}, ${estado}, '2026-01-15', ${lugarId},
        'Rehabilitacion del parque municipal', ${gente.motul.OPERADOR}
      )
    `),
  );

describe("CHECKs de intervenciones", () => {
  it("rechaza un tipo fuera de la union cerrada", async () => {
    const lugarId = await lugarDe();
    const motivo = await motivoDeFalla(() =>
      insertarCon(lugarId, "INCENDIO", "PLANIFICADA"),
    );

    expect(motivo).toMatch(/intervenciones_tipo_valido/i);
  });

  it("rechaza un estado fuera de la union cerrada", async () => {
    const lugarId = await lugarDe();
    const motivo = await motivoDeFalla(() =>
      insertarCon(lugarId, "OBRA", "ABIERTA"),
    );

    expect(motivo).toMatch(/intervenciones_estado_valido/i);
  });
});
