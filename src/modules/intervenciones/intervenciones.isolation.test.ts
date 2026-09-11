import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
import { intervenciones } from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

type Municipio = "motul" | "ticul";

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

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (municipio: Municipio, lugarId: string) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId,
          lugarId,
          registradoPorUsuarioId: gente[municipio].OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

describe("aislamiento de intervenciones", () => {
  it("una consulta del tenant solo devuelve sus intervenciones", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Intervenciones");
    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Intervenciones");
    const idMotul = await insertar("motul", lugarMotul);
    await insertar("ticul", lugarTicul);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(intervenciones),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(idMotul);
  });

  it("un id de otro tenant equivale a no encontrado", async () => {
    const lugarTicul = await lugarDe(
      "ticul",
      "Comisaria Ticul Intervencion 404",
    );
    const idTicul = await insertar("ticul", lugarTicul);

    const filas = await withTenant(motul, (tx) =>
      tx
        .select({ id: intervenciones.id })
        .from(intervenciones)
        .where(eq(intervenciones.id, idTicul)),
    );

    expect(filas).toEqual([]);
  });
});
