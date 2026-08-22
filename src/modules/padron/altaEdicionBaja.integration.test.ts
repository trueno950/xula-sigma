import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  crearAltaDePersona,
  crearDarDeBajaPersona,
  crearEditarPersona,
} from "./application";
import { normalizarParaBusqueda } from "./domain";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";
import { personas } from "./infrastructure/esquema";

/**
 * Contra Postgres real: prueba las dos costuras que un test de puertos
 * mockeados no puede sostener por si solo (design.md secciones 5 y 10).
 *
 * 1. `nombreNormalizado` sale de la misma `normalizarParaBusqueda` que
 *    corre por fuera, recalculada, tras un alta y tras una edicion.
 * 2. La bitacora que escribe cada caso de uso trae exactamente las columnas
 *    de `Traza` — nunca nombre ni CURP — sobre las tres acciones de esta
 *    rebanada.
 */

const contexto: ContextoActual = {
  ayuntamientoId: motul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
};

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const editarPersona = crearEditarPersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const darDeBajaPersona = crearDarDeBajaPersona(repositorioDePersonasSql);

const nombreNormalizadoDe = async (id: string): Promise<string | undefined> => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .select({ nombreNormalizado: personas.nombreNormalizado })
      .from(personas)
      .where(eq(personas.id, id)),
  );

  return fila?.nombreNormalizado;
};

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("costura de la columna normalizada", () => {
  it("tras el alta, nombreNormalizado coincide con normalizarParaBusqueda recalculado por fuera", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Maria Guadalupe",
        primerApellido: "Kumul",
        segundoApellido: "Pech",
        curp: null,
      },
      contexto,
    );

    const expansiones = await withTenant(motul, (tx) =>
      catalogoDeAbreviaturasSql.leer(tx),
    );
    const esperado = normalizarParaBusqueda(
      "Maria Guadalupe Kumul Pech",
      expansiones,
    );

    await expect(nombreNormalizadoDe(id)).resolves.toBe(esperado);
  });

  it("tras editar primerApellido, nombreNormalizado se reescribe con el valor nuevo", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Juan",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    await editarPersona(
      id,
      {
        nombres: "Juan",
        primerApellido: "Canul",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    const expansiones = await withTenant(motul, (tx) =>
      catalogoDeAbreviaturasSql.leer(tx),
    );
    const esperado = normalizarParaBusqueda("Juan Canul", expansiones);

    await expect(nombreNormalizadoDe(id)).resolves.toBe(esperado);
  });
});

describe("bitacora de solo escritura", () => {
  it("alta, edicion y baja dejan solo columnas de ids, sin nombre ni CURP", async () => {
    const curp = "UCXR900101MYNCXR05";
    const { id } = await altaDePersona(
      { nombres: "Rosa", primerApellido: "Uc", segundoApellido: null, curp },
      contexto,
    );
    await editarPersona(
      id,
      { nombres: "Rosa", primerApellido: "Uc", segundoApellido: "Chan", curp },
      contexto,
    );
    await darDeBajaPersona(id, contexto);

    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(bitacora)
        .where(
          and(eq(bitacora.entidad, "personas"), eq(bitacora.entidadId, id)),
        ),
    );

    expect(filas.map((fila) => fila.accion).sort()).toEqual(
      ["ALTA_PERSONA", "BAJA_PERSONA", "EDITAR_PERSONA"].sort(),
    );

    for (const fila of filas) {
      expect(Object.keys(fila).sort()).toEqual(
        [
          "id",
          "ayuntamientoId",
          "actor",
          "accion",
          "entidad",
          "entidadId",
          "origen",
          "ocurridoEn",
        ].sort(),
      );
      expect(JSON.stringify(fila)).not.toMatch(/Rosa|Chan|UCXR900101MYNCXR05/);
    }
  });
});
