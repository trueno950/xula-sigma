import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  consultaDeBusqueda,
  ramasDeCoincidencia,
} from "./infrastructure/coincidenciasDeBusquedaSql";
import { personas } from "./infrastructure/esquema";

/**
 * Sargabilidad de la consulta real, no de `nombreNormalizado % cadena` en
 * aislamiento: con el `OR` que la busqueda usaba antes, las otras dos ramas
 * -prefijo de palabra y prefijo de CURP- no son sargables, y Postgres cae a
 * un `Seq Scan` que deja el `%` como filtro -lo que el escenario de
 * sargabilidad del spec ("Busqueda tolerante a variantes con trigramas")
 * existe para descartar-. La consulta es un `UNION` de ramas y este archivo
 * EXPLAINea tanto esa consulta como la rama de trigramas sola.
 *
 * `enable_seqscan = off` deja la eleccion entre el GIN y el btree de
 * tenant, y con RLS apagada el btree gana por costo (`personas_id_tenant_key`
 * sirve para filtrar sin indice trigramico). `enable_indexscan = off`
 * -ademas del `enable_seqscan = off` del spec- quita ese btree de encima y
 * deja un solo camino: el `Bitmap Index Scan` del GIN. Una consulta rota -el
 * `%` detras de una funcion opaca- cae en el `Seq Scan` deshabilitado, sin
 * GIN en el plan.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const opciones = {
  umbral: 0.3,
  limite: 51,
  palabras: ["xopz8001"],
  curp: "XOPZ8001",
};

const planDe = async (consulta: string, parametros: readonly unknown[]) =>
  owner.begin(async (tx) => {
    // Deshabilita RLS, corre el EXPLAIN, y la vuelve a habilitar antes del
    // COMMIT: el estado final de `personas` no cambia, pero adentro de la
    // transaccion la consulta ve la tabla entera, sin el filtro de tenant
    // que RLS agregaria.
    await tx`ALTER TABLE personas DISABLE ROW LEVEL SECURITY`;
    await tx`SET LOCAL enable_seqscan = off`;
    await tx`SET LOCAL enable_indexscan = off`;

    const plan = await tx.unsafe(`EXPLAIN ${consulta}`, [
      ...parametros,
    ] as Parameters<typeof tx.unsafe>[1]);

    await tx`ALTER TABLE personas ENABLE ROW LEVEL SECURITY`;
    await tx`ALTER TABLE personas FORCE ROW LEVEL SECURITY`;

    return plan.map((fila) => Object.values(fila)[0]).join("\n");
  });

describe("sargabilidad de la busqueda completa", () => {
  it("la rama de trigramas se sirve del indice GIN dentro de la consulta real", async () => {
    const { sql: consulta, params } = await withTenant(motul, async (tx) =>
      consultaDeBusqueda(tx, "xopz8001", opciones).toSQL(),
    );

    const textoDelPlan = await planDe(consulta, params);

    expect(textoDelPlan).toContain(
      "Bitmap Index Scan on personas_nombre_normalizado_trgm_idx",
    );
    expect(textoDelPlan).toContain("Index Cond: (nombre_normalizado %");
  });

  it("la rama de trigramas sola nunca cae en un Seq Scan", async () => {
    const [trigramas] = ramasDeCoincidencia("xopz8001", opciones);

    const { sql: consulta, params } = await withTenant(motul, async (tx) =>
      tx.select({ id: personas.id }).from(personas).where(trigramas).toSQL(),
    );

    const textoDelPlan = await planDe(consulta, params);

    expect(textoDelPlan).not.toContain("Seq Scan");
    expect(textoDelPlan).toContain(
      "Bitmap Index Scan on personas_nombre_normalizado_trgm_idx",
    );
  });
});
