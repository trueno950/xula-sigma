import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "./esquema";
import {
  appSinTenant,
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
  subdominioTicul,
  ticul,
} from "./municipiosDePrueba";
import {
  cerrarConexion,
  resolverAyuntamientoPorSubdominio,
  withTenant,
} from "./withTenant";

/**
 * `resolverAyuntamientoPorSubdominio` es la unica consulta del sistema que
 * corre sin tenant fijado. Estos tests son lo que sostiene esa excepcion.
 */

beforeAll(sembrar);

afterAll(async () => {
  await limpiar();
  await owner.end();
  await appSinTenant.end();
  await cerrarConexion();
});

describe("resolucion de tenant sin tenant fijado", () => {
  it("resuelve el ayuntamiento por subdominio", async () => {
    const resuelto = await resolverAyuntamientoPorSubdominio(subdominioTicul);

    expect(resuelto?.id).toBe(ticul);
    expect(resuelto?.nombre).toBe("Ticul");
  });

  it("devuelve null para un subdominio que no existe", async () => {
    expect(await resolverAyuntamientoPorSubdominio("no-existe")).toBeNull();
  });

  it("expone solo las columnas del directorio publico", async () => {
    const resuelto = await resolverAyuntamientoPorSubdominio(subdominioMotul);

    // Contra el conjunto EXACTO de claves, no contra las que esperamos
    // ver. El dia que `ayuntamientos` gane una columna sensible, esto
    // falla y obliga a decidir si va o no a una superficie que se sirve
    // antes de autenticar.
    expect(Object.keys(resuelto ?? {}).sort()).toEqual([
      "id",
      "marca",
      "nombre",
      "subdominio",
    ]);
  });

  it("la conexion sin tenant no ve NINGUNA fila de NINGUNA tabla operativa", async () => {
    /**
     * Lo que vuelve segura la excepcion no es que la funcion este bien
     * escrita: es que por esa misma conexion ninguna tabla operativa
     * devuelve nada.
     *
     * El barrido sale del catalogo, no de una lista escrita a mano. Una
     * tabla futura con una politica demasiado permisiva cae aca sin que
     * nadie tenga que acordarse de agregarla.
     */
    const tablas = await owner<{ tabla: string }[]>`
      SELECT c.relname AS tabla
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'public'
              AND col.table_name = c.relname
              AND col.column_name = 'ayuntamiento_id'
         )
    `;

    // Sin esto el test es vacio: cero tablas recorridas pasan siempre.
    expect(tablas.length).toBeGreaterThan(0);

    // Y sin esto tambien: si la base estuviera vacia, "no ve nada" no
    // probaria nada. Confirmamos que CON tenant si hay filas.
    const conTenant = await withTenant(motul, (tx) =>
      tx.select().from(bitacora),
    );
    expect(conTenant.length).toBeGreaterThan(0);

    const conFugas: string[] = [];
    for (const { tabla } of tablas) {
      // El nombre viene del catalogo de Postgres, no de una entrada.
      const filas = await appSinTenant.unsafe(`SELECT 1 FROM "${tabla}"`);
      if (filas.length > 0) conFugas.push(`${tabla} (${filas.length} filas)`);
    }

    expect(conFugas).toEqual([]);
  });
});
