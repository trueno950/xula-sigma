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
import { crearListarIntervencionesParaMapa } from "./application/listarIntervencionesParaMapa";
import { intervenciones } from "./infrastructure/esquema";
import { lectorDeIntervencionesDeMapaSql } from "./infrastructure/lectorDeIntervencionesDeMapaSql";
import { intervencionDe } from "./intervencionDePrueba";

/**
 * Contra Postgres real: que la lectura del mapa acote por el tenant del
 * contexto y que `descripcion` y `reporteId` no salgan por este camino. Un
 * puerto mockeado no demuestra ninguna de las dos: la primera la garantiza
 * RLS y la segunda, la lista explicita de columnas del adaptador.
 */

let gente: GentePorMunicipio;

const listarIntervencionesParaMapa = crearListarIntervencionesParaMapa(
  lectorDeIntervencionesDeMapaSql,
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

const insertarIntervencion = async (datos: {
  municipio: Municipio;
  lugarId: string;
  calleId?: string | null;
}) => {
  const ayuntamientoId = datos.municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId,
          lugarId: datos.lugarId,
          calleId: datos.calleId ?? null,
          registradoPorUsuarioId: gente[datos.municipio].OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

describe("listarIntervencionesParaMapa, contra Postgres real", () => {
  it("devuelve la fila con calleId nulo sin descartarla", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Mapa Nula");
    const id = await insertarIntervencion({
      municipio: "motul",
      lugarId,
      calleId: null,
    });

    const filas = await listarIntervencionesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const fila = filas.find((f) => f.id === id);

    expect(fila).toMatchObject({ calleId: null, lugarId });
  });

  it("no cruza municipios: un contexto de Motul no ve intervenciones de Ticul", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Mapa Motul Int");
    const lugarTicul = await lugarDe("ticul", "Comisaria Mapa Ticul Int");
    const deMotul = await insertarIntervencion({
      municipio: "motul",
      lugarId: lugarMotul,
    });
    const deTicul = await insertarIntervencion({
      municipio: "ticul",
      lugarId: lugarTicul,
    });

    const filas = await listarIntervencionesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const ids = filas.map((fila) => fila.id);

    expect(ids).toContain(deMotul);
    expect(ids).not.toContain(deTicul);
  });

  it("no devuelve descripcion ni reporteId, solo los cinco campos contratados", async () => {
    const lugarId = await lugarDe("motul", "Comisaria Mapa Protegida Int");
    const id = await insertarIntervencion({ municipio: "motul", lugarId });

    const filas = await listarIntervencionesParaMapa(
      contextoDe(gente, "motul", "OPERADOR"),
    );
    const fila = filas.find((f) => f.id === id);

    expect(Object.keys(fila ?? {}).sort()).toEqual([
      "calleId",
      "estado",
      "id",
      "lugarId",
      "tipo",
    ]);
    expect(fila).not.toHaveProperty("descripcion");
    expect(fila).not.toHaveProperty("reporteId");
  });
});
