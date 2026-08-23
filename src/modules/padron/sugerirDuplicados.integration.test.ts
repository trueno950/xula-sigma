import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearAltaDePersona, crearSugerirDuplicados } from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: el escenario del spec "Un nombre a medio escribir
 * ya trae a la persona existente" (rebanada 4) — nombre de pila completo
 * mas las primeras letras del apellido paterno, la clase "tecleando" que
 * mide design.md seccion 3.
 */

const contexto: ContextoActual = {
  ayuntamientoId: motul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "OPERADOR",
  },
  origen: "web",
};

const altaDePersona = crearAltaDePersona(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);
const sugerirDuplicados = crearSugerirDuplicados(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("sugerirDuplicados", () => {
  it("un nombre a medio escribir ya trae a la persona existente entre las sugerencias", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Maria Guadalupe",
        primerApellido: "Kumul",
        segundoApellido: "Sanchez",
        curp: null,
      },
      contexto,
    );

    // Nombre de pila completo + primeras cuatro letras del apellido
    // paterno: la clase "tecleando" del spike.
    const sugerencias = await sugerirDuplicados(
      "Maria Guadalupe Kumu",
      contexto,
    );

    expect(sugerencias.some((persona) => persona.id === id)).toBe(true);
  });
});
