import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  appSinTenant,
  motul,
  owner,
  subdominioMotul,
  subdominioTicul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  limpiarEsquemaAnterior,
  montarEsquemaAnterior,
  RUTA_DE_BUSQUEDA_ANTERIOR,
  sembrarMunicipiosAnteriores,
  type TipoDeLugarAnterior,
} from "./baseAnteriorAlCorteDePrueba";
import {
  type CalleId,
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type DomicilioId,
  type LugarId,
} from "./domain";
import { calles, domicilios } from "./infrastructure/esquema";

/**
 * La conexion al esquema anterior al corte de `sector`/`manzana`, y la
 * siembra que escribe en el. El porque del esquema, en
 * `baseAnteriorAlCorteDePrueba.ts`.
 *
 * No es `lugarDePrueba.ts` con otro `search_path`: el esquema anterior
 * admite un `tipo` que el dominio ya no tiene, asi que `lugares` se escribe
 * con SQL y el valor lo valida el CHECK de 0007 —el de la base anterior, no
 * una suposicion del test—. `calles` y `domicilios` no nombran el catalogo
 * y van por Drizzle como cualquier fixture.
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL para la base anterior.");

/**
 * `search_path` en el arranque de la conexion, no en cada consulta: Drizzle
 * escribe los nombres de tabla sin calificar, asi que es el unico lugar
 * donde se puede decidir contra que esquema corre todo el archivo.
 */
const clienteAnterior = postgres(url, {
  max: 1,
  prepare: false,
  connection: { search_path: RUTA_DE_BUSQUEDA_ANTERIOR },
});

const bdAnterior = drizzle(clienteAnterior, { casing: "snake_case" });

export type TransaccionAnterior = Parameters<
  Parameters<typeof bdAnterior.transaction>[0]
>[0];

/** `withTenant`, pero con el `search_path` del esquema anterior. */
export const withTenantAnterior = async <T>(
  ayuntamientoId: AyuntamientoId,
  trabajo: (tx: TransaccionAnterior) => Promise<T>,
): Promise<T> =>
  bdAnterior.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant', ${ayuntamientoId}, true)`,
    );

    return trabajo(tx);
  });

/**
 * La conexion del rol de aplicacion **sin** tenant fijado, contra el
 * esquema anterior: sirve para comprobar que un `UPDATE` sin `app.tenant`
 * afecta cero filas sin error, que es el modo de falla que la migracion
 * B3d documenta.
 */
export const sinTenantAnterior = clienteAnterior;

export const cerrarConexionAnterior = async (): Promise<void> => {
  await clienteAnterior.end();
};

/**
 * El ciclo de vida que comparten los cuatro tests de la migracion B3d:
 * esquema anterior recien replicado y los dos municipios de prueba.
 */
export const prepararBaseAnterior = async (): Promise<void> => {
  montarEsquemaAnterior();
  sembrarMunicipiosAnteriores({
    motul,
    ticul,
    subdominioMotul,
    subdominioTicul,
  });
};

/** El desarme: se borra el esquema y se cierran las tres conexiones. */
export const cerrarBaseAnterior = async (): Promise<void> => {
  limpiarEsquemaAnterior();
  await cerrarConexionAnterior();
  await owner.end();
  await appSinTenant.end();
  await cerrarConexion();
};

const exigirFila = <T>(fila: T | undefined): T => {
  if (!fila) throw new Error("La insercion de prueba no devolvio una fila");
  return fila;
};

/** Un lugar del esquema anterior: el `tipo` puede ser `sector` o `manzana`. */
export const crearLugarAnterior = async (opciones: {
  ayuntamientoId: AyuntamientoId;
  tipo: TipoDeLugarAnterior;
  nombre: string;
  padreId?: LugarId | undefined;
}): Promise<LugarId> => {
  const filas = await withTenantAnterior(opciones.ayuntamientoId, (tx) =>
    tx.execute<{ id: string }>(sql`
      INSERT INTO lugares (ayuntamiento_id, tipo, nombre, padre_id)
      VALUES (${opciones.ayuntamientoId}, ${opciones.tipo}, ${opciones.nombre},
              ${opciones.padreId ?? null})
      RETURNING id
    `),
  );

  return comoLugarId(exigirFila(filas[0]).id);
};

export const crearCalleAnterior = (
  ayuntamientoId: AyuntamientoId,
  lugarId: LugarId,
  nombre: string,
): Promise<CalleId> =>
  withTenantAnterior(ayuntamientoId, async (tx) => {
    const [fila] = await tx
      .insert(calles)
      .values({ ayuntamientoId, nombre, lugarId })
      .returning({ id: calles.id });

    return comoCalleId(exigirFila(fila).id);
  });

export const crearDomicilioAnterior = (
  ayuntamientoId: AyuntamientoId,
  lugarId: LugarId,
  calleId: CalleId,
): Promise<DomicilioId> =>
  withTenantAnterior(ayuntamientoId, async (tx) => {
    const [fila] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId, lugarId, calleId })
      .returning({ id: domicilios.id });

    return comoDomicilioId(exigirFila(fila).id);
  });

/**
 * Reinserta un lugar borrado por el script, con el `tipo` que traia. Es el
 * camino de vuelta del rollback: `bitacora` guarda el `padre_id`, y el
 * `tipo`/`nombre` salen de la salida guardada.
 */
export const insertarLugarAnterior = (
  tx: TransaccionAnterior,
  ayuntamientoId: AyuntamientoId,
  lugar: {
    id: LugarId;
    tipo: TipoDeLugarAnterior;
    nombre: string;
    padreId: LugarId | null;
    bajaEn: Date | null;
  },
): Promise<unknown> =>
  tx.execute(sql`
    INSERT INTO lugares (id, ayuntamiento_id, tipo, nombre, padre_id, baja_en)
    VALUES (${lugar.id}, ${ayuntamientoId}, ${lugar.tipo}, ${lugar.nombre},
            ${lugar.padreId}, ${lugar.bajaEn?.toISOString() ?? null}::timestamptz)
  `);

/** Los `lugares` del esquema anterior que quedan, filtrados por tipo. */
export const contarLugaresAnteriores = async (
  ayuntamientoId: AyuntamientoId,
  tipos: readonly TipoDeLugarAnterior[],
): Promise<number> => {
  const filas = await withTenantAnterior(ayuntamientoId, (tx) =>
    tx.execute<{ total: string }>(sql`
      SELECT count(*)::text AS total FROM lugares
       WHERE ayuntamiento_id = ${ayuntamientoId}
         AND tipo = ANY(${tipos}::text[])
    `),
  );

  return Number(exigirFila(filas[0]).total);
};
