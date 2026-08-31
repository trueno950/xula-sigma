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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { reportes } from "./infrastructure/esquema";
import { reporteDe } from "./reporteDePrueba";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin pasar por caso de uso -- la
 * Fase 4 todavia no existe. Los `lugarId` de prueba se crean por la
 * superficie publica real de `territorio` (`altaDeLugar`), nunca por SQL
 * directo contra sus tablas -- esas son inalcanzables fuera de su modulo
 * (design.md seccion 6), mismo criterio que `residencias.isolation.test.ts`.
 *
 * Solo el aislamiento por RLS. Los FK compuestos cruzados estan en
 * `reportes.clavesForaneas.isolation.test.ts` y los CHECKs de negocio en
 * `reportes.checks.isolation.test.ts`: mismo mecanismo, archivos aparte por
 * la metrica de lineas por archivo (`AGENTS.md`).
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
});
