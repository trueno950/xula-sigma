import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  crearAltaDePersona,
  crearBuscarPersonas,
  crearListarPersonas,
} from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";

/**
 * Contra Postgres real: que `limite` sea el `LIMIT` de la consulta y no un
 * recorte en memoria, y que `orden` cambie el `ORDER BY` real -las dos cosas
 * que un puerto mockeado no puede demostrar (`repositorioDePersonasSql.test.ts`
 * explica por que ese archivo no las prueba).
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
const listarPersonas = crearListarPersonas(repositorioDePersonasSql);
const buscarPersonas = crearBuscarPersonas(
  repositorioDePersonasSql,
  catalogoDeAbreviaturasSql,
);

/**
 * Las tres comparten `segundoApellido` -un token largo y distintivo, sin
 * choque con otro dato del tenant- para que una sola busqueda las encuentre
 * a las tres con similarity por encima del umbral, sin depender de cuanto
 * se parezca cada nombre individual (`buscarPersonas.integration.test.ts`
 * ya mide el umbral real con nombres cortos; aca solo interesa que
 * `limite`/`orden` funcionen sobre un resultado con mas de una fila).
 */
const TOKEN_DE_BUSQUEDA = "xtestpaginacion";

beforeAll(async () => {
  await sembrar();
  await altaDePersona(
    {
      nombres: "Ana",
      primerApellido: "Ake",
      segundoApellido: TOKEN_DE_BUSQUEDA,
      curp: null,
    },
    contexto,
  );
  await altaDePersona(
    {
      nombres: "Beto",
      primerApellido: "Balam",
      segundoApellido: TOKEN_DE_BUSQUEDA,
      curp: null,
    },
    contexto,
  );
  await altaDePersona(
    {
      nombres: "Coco",
      primerApellido: "Canul",
      segundoApellido: TOKEN_DE_BUSQUEDA,
      curp: null,
    },
    contexto,
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("paginacion y orden, contra Postgres real", () => {
  it("limite es el LIMIT real: recorta y marca hayMas", async () => {
    const pagina = await listarPersonas(contexto, { limite: 2 });

    expect(pagina.personas).toHaveLength(2);
    expect(pagina.hayMas).toBe(true);
  });

  it("con limite igual o mayor al total, hayMas es falso", async () => {
    const pagina = await listarPersonas(contexto, { limite: 50 });

    expect(pagina.personas.length).toBeGreaterThanOrEqual(3);
    expect(pagina.hayMas).toBe(false);
  });

  it("orden asc por defecto: apellido alfabetico", async () => {
    const pagina = await listarPersonas(contexto, { limite: 50 });
    const apellidos = pagina.personas.map((p) => p.primerApellido);

    expect(apellidos).toEqual([...apellidos].sort());
  });

  it("orden desc invierte el alfabetico", async () => {
    const pagina = await listarPersonas(contexto, {
      limite: 50,
      orden: { campo: "persona", direccion: "desc" },
    });
    const apellidos = pagina.personas.map((p) => p.primerApellido);

    expect(apellidos).toEqual([...apellidos].sort().reverse());
  });

  it("buscarPersonas tambien pagina: limite recorta y marca hayMas", async () => {
    const pagina = await buscarPersonas(TOKEN_DE_BUSQUEDA, contexto, {
      limite: 1,
    });

    expect(pagina.personas).toHaveLength(1);
    expect(pagina.hayMas).toBe(true);
  });

  it("buscarPersonas con orden reemplaza la relevancia por alfabetico", async () => {
    const pagina = await buscarPersonas(TOKEN_DE_BUSQUEDA, contexto, {
      limite: 50,
      orden: { campo: "persona", direccion: "asc" },
    });
    const apellidos = pagina.personas.map((p) => p.primerApellido);

    expect(pagina.personas.length).toBeGreaterThanOrEqual(3);
    expect(apellidos).toEqual([...apellidos].sort());
  });
});
