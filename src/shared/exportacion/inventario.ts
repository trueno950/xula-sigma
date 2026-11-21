import { eq, sql } from "drizzle-orm";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeExportar } from "@/shared/auth/roles";
import { NoAutorizadoError, TenantNoResueltoError } from "@/shared/lib/errores";
import { leerMarca } from "@/shared/marca";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import type { PorcionExportable } from "./agregarPorciones";
import { nombreDelArchivo } from "./archivoDeExportacion";
import { nombresDePlataforma } from "./conjuntosDePlataforma";

/**
 * El inventario que la pantalla de exportacion muestra antes de descargar
 * (S10 y S11 de `marca-exportacion-ux`): que conjuntos lleva el ZIP y
 * cuantas filas trae cada uno.
 *
 * **La lista es la del ZIP, no una copia.** Sale de `nombresDePlataforma` y
 * de las mismas porciones que `descargaDeDatos.ts` le pasa al exportador, en
 * el mismo orden en que `conjuntosDe` las pone en el archivo. Un conjunto
 * nuevo aparece en el inventario el dia que aparece en el ZIP;
 * `inventarioDeExportacion.isolation.test.ts` compara las dos listas.
 *
 * **El conteo no lee las filas.** Se cuenta con `count(*)` bajo la
 * transaccion del tenant, que RLS acota igual que a la exportacion: leer los
 * conjuntos enteros para pintar un numero seria una entrega de datos sin
 * bitacora de por medio cada vez que alguien abre la pantalla.
 */

export type ConjuntoDelInventario = { nombre: string; filas: number };

export type Inventario = {
  /** El nombre que tendria el ZIP pedido ahora: municipio y dia en Merida. */
  archivo: string;
  /** Si el municipio tiene escudo, el ZIP lleva ademas `escudo.png`. */
  tieneEscudo: boolean;
  conjuntos: readonly ConjuntoDelInventario[];
};

/** Los conjuntos del archivo, en el orden en que van a ir adentro. */
export const nombresDeConjuntos = (
  porciones: readonly PorcionExportable[],
): readonly string[] => [
  ...nombresDePlataforma,
  ...porciones.map((porcion) => porcion.nombre),
];

/**
 * Las filas de un conjunto, contadas por Postgres.
 *
 * **El nombre del conjunto es el nombre de su tabla** —`personas.csv` sale de
 * `personas`, y `archivoDeConjunto` ya daba por cierto eso al nombrar el
 * archivo—, asi que el conteo no repite el mapeo conjunto/tabla en otro
 * archivo que se pueda quedar viejo. Un conjunto que deje de cumplirlo rompe
 * `inventarioDeExportacion.isolation.test.ts`, que compara este numero contra
 * las filas que entrega el ZIP.
 *
 * `sql.identifier` y no una plantilla de texto: el nombre termina citado por
 * el motor, y ningun valor de la peticion llega hasta aca.
 */
export const contarConjunto = async (
  tx: TransaccionTenant,
  nombre: string,
): Promise<number> => {
  const [fila] = await tx.execute<{ filas: number }>(
    sql`select count(*)::int as filas from ${sql.identifier(nombre)}`,
  );

  return Number(fila?.filas ?? 0);
};

const municipioDelInventario = async (
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
): Promise<{ subdominio: string; tieneEscudo: boolean }> => {
  const [municipio] = await tx
    .select({
      subdominio: ayuntamientos.subdominio,
      marca: ayuntamientos.marca,
    })
    .from(ayuntamientos)
    .where(eq(ayuntamientos.id, ayuntamientoId));

  if (!municipio) throw new TenantNoResueltoError();

  return {
    subdominio: municipio.subdominio,
    tieneEscudo: leerMarca(municipio.marca).escudo !== undefined,
  };
};

const contarCadaConjunto = async (
  tx: TransaccionTenant,
  nombres: readonly string[],
): Promise<ConjuntoDelInventario[]> => {
  const conjuntos: ConjuntoDelInventario[] = [];

  for (const nombre of nombres) {
    conjuntos.push({ nombre, filas: await contarConjunto(tx, nombre) });
  }

  return conjuntos;
};

/**
 * @param ahora El instante con el que se nombra el archivo. Se pasa para que
 *   un test pueda fijarlo; en la pantalla es el momento del render.
 */
export async function inventarioDeAyuntamiento(
  contexto: ContextoActual,
  porciones: readonly PorcionExportable[],
  ahora: Date = new Date(),
): Promise<Inventario> {
  if (!puedeExportar(contexto.usuario.rol)) throw new NoAutorizadoError();

  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const municipio = await municipioDelInventario(tx, contexto.ayuntamientoId);

    return {
      archivo: nombreDelArchivo(municipio.subdominio, ahora),
      tieneEscudo: municipio.tieneEscudo,
      conjuntos: await contarCadaConjunto(tx, nombresDeConjuntos(porciones)),
    };
  });
}
