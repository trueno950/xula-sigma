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

/**
 * Contra Postgres real: prueba lo que la 3.2/3.5 no pueden con puertos
 * mockeados — que "gpe kumul" encuentra a la persona por encima del umbral
 * medido, que una persona dada de baja no aparece, y que el operador `%`
 * es sargable sobre el indice GIN.
 *
 * Por que la sargabilidad se prueba deshabilitando RLS dentro de una
 * transaccion (`owner.begin`, mas abajo) y no con un `enable_seqscan=off`
 * comun: el requisito "Busqueda tolerante a variantes con trigramas" del
 * spec, que tambien trae la historia de por que la primera version de este
 * test no discriminaba una consulta rota.
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

  it("el operador % es sargable: sin RLS de por medio, el plan usa el indice GIN", async () => {
    await altaDePersona(
      {
        nombres: "Otra Guadalupe",
        primerApellido: "Uc",
        segundoApellido: null,
        curp: null,
      },
      contexto,
    );

    // Deshabilita RLS, corre el EXPLAIN, y la vuelve a habilitar antes del
    // COMMIT: el estado final de `personas` no cambia, pero adentro de la
    // transaccion la consulta ve la tabla entera, sin el filtro de tenant
    // que RLS agregaria — la unica forma de aislar si `%` en si mismo es
    // sargable, sin que el btree de tenant tape la respuesta.
    const textoDelPlan = await owner.begin(async (tx) => {
      await tx`ALTER TABLE personas DISABLE ROW LEVEL SECURITY`;
      await tx`SET LOCAL enable_seqscan = off`;

      const plan = await tx`
        EXPLAIN SELECT id FROM personas
         WHERE nombre_normalizado % ${"guadalupe uc"}
      `;

      await tx`ALTER TABLE personas ENABLE ROW LEVEL SECURITY`;
      await tx`ALTER TABLE personas FORCE ROW LEVEL SECURITY`;

      return plan.map((fila) => Object.values(fila)[0]).join("\n");
    });

    expect(textoDelPlan).toContain("personas_nombre_normalizado_trgm_idx");
  });
});
