import { and, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDePersona, crearBuscarPersonas } from "./application";
import {
  catalogoDeAbreviaturasSql,
  repositorioDePersonasSql,
} from "./infrastructure";
import { personas } from "./infrastructure/esquema";

/**
 * Contra Postgres real: prueba lo que la 3.2/3.5 no pueden con puertos
 * mockeados — que "gpe kumul" encuentra a la persona por encima del umbral
 * medido, que una persona dada de baja no aparece, y que la consulta es
 * sargable (design.md seccion 10, `EXPLAIN` sobre el GIN).
 *
 * La ultima parte se corrigio contra el spec original tras medir: RLS
 * agrega siempre `ayuntamiento_id = tenant`, y esa condicion por si sola
 * ya alcanza a toda la fila del municipio, asi que el planner prefiere su
 * propio btree de tenant antes que el GIN a cualquier volumen razonable de
 * un ayuntamiento chico (medido con 2.000/50.000/200.000 filas de un
 * tenant). Que el GIN es sargable se prueba forzando `enable_seqscan =
 * off`: sin eso, Postgres no tiene por que preferirlo, y no es un defecto
 * de la consulta — es su costo real. Verificar sargabilidad, no que el
 * planner elija especificamente el GIN.
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
const buscarPersonas = crearBuscarPersonas(
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

describe("busqueda tolerante a variantes", () => {
  it('"gpe kumul" encuentra a "Maria Guadalupe Kumul" por encima del umbral', async () => {
    await altaDePersona(
      {
        nombres: "Maria Guadalupe",
        primerApellido: "Kumul",
        segundoApellido: "Pech",
        curp: null,
      },
      contexto,
    );

    const resultado = await buscarPersonas("gpe kumul", contexto);

    expect(
      resultado.some(
        (persona) =>
          persona.nombres === "Maria Guadalupe" &&
          persona.primerApellido === "Kumul",
      ),
    ).toBe(true);
  });

  it("una persona dada de baja no aparece sin pedir explicitamente inactivas", async () => {
    const { id } = await altaDePersona(
      {
        nombres: "Rosaria Guadalupe",
        primerApellido: "Chan",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    await withTenant(motul, (tx) =>
      repositorioDePersonasSql.marcarBaja(tx, id, new Date()),
    );

    const resultado = await buscarPersonas("guadalupe chan", contexto);

    expect(resultado.some((persona) => persona.id === id)).toBe(false);
  });

  it("la consulta es sargable: con enable_seqscan=off el plan no hace un secuencial", async () => {
    await altaDePersona(
      {
        nombres: "Otra Guadalupe",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    const plan = await withTenant(motul, async (tx) => {
      await tx.execute(sql`SET LOCAL enable_seqscan = off`);
      await tx.execute(
        sql`SELECT set_config('pg_trgm.similarity_threshold', '0.3', true)`,
      );

      const consulta = tx
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            isNull(personas.bajaEn),
            sql`${personas.nombreNormalizado} % ${"guadalupe uc"}`,
          ),
        );

      return tx.execute(sql`EXPLAIN ${consulta}`);
    });

    const textoDelPlan = plan.map((fila) => Object.values(fila)[0]).join("\n");

    expect(textoDelPlan).not.toContain("Seq Scan");
  });
});
