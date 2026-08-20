import { eq } from "drizzle-orm";
import type { ContextoActual } from "@/shared/auth/contexto";
import { usuarios } from "@/shared/auth/esquema";
import { puedeExportar } from "@/shared/auth/roles";
import { NoAutorizadoError, TenantNoResueltoError } from "@/shared/lib/errores";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { registrar } from "@/shared/tenancy/bitacora";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";

/**
 * La entrega de los datos de un ayuntamiento, en formato abierto.
 *
 * Existe desde Fase 0 y no se agrega despues, y la razon no es tecnica:
 * cuando cambia la administracion y el municipio no renueva, necesita su
 * informacion —probablemente esta obligado a conservarla por normativa de
 * archivo—. Si no se puede entregar limpia, sus datos quedan secuestrados.
 *
 * El costo de construirla no crece con el tiempo de forma pareja: crece
 * con cada modulo que se escribio sin tenerla en cuenta. Por eso el
 * exportador es un punto de extension desde el primer dia y cada modulo
 * aporta su porcion cuando se construye, en vez de que alguien recorra
 * ocho modulos al final.
 *
 * **Carga todo en memoria.** Para un municipio de menos de 5.000 personas
 * es correcto y es lo mas simple que funciona. El dia que un conjunto no
 * entre, lo que cambia es esta funcion y no el contrato de las porciones:
 * `leer` ya devuelve por conjunto y no un volcado unico.
 */

/**
 * Lo que un modulo aporta al exportador.
 *
 * `leer` recibe la transaccion **ya abierta** por `withTenant` y no un
 * manejador de base. No es comodidad: es lo que impide que una porcion
 * exporte de mas. Su consulta puede salir sin `where` de tenant y RLS la
 * acota igual, porque corre con el `app.tenant` de quien pidio la
 * exportacion.
 */
export type PorcionExportable = {
  /** El nombre del conjunto en el archivo entregado. */
  nombre: string;
  leer: (tx: TransaccionTenant) => Promise<readonly unknown[]>;
};

export type Exportacion = {
  generadaEn: Date;
  ayuntamiento: { id: string; subdominio: string; nombre: string };
  conjuntos: Record<string, readonly unknown[]>;
};

/**
 * Las columnas se listan una por una, igual que en
 * `resolverAyuntamientoPorSubdominio` y por un motivo mas fuerte: el dia
 * que `usuarios` gane una columna sensible, un `select()` pelado la mete
 * sola en un archivo que sale de la organizacion.
 *
 * **Que NO se exporta, y por que.** El codigo no puede explicar la
 * ausencia de una tabla, asi que va aca:
 *
 * - `cuentas` — lleva el hash de la contrasenia. Argon2 no se revierte,
 *   pero un volcado de hashes junto a los correos reales es material de
 *   fuerza bruta offline, y la gente reusa la clave del municipio en otro
 *   lado. No es dato del municipio: es una credencial.
 * - `sesiones` y `verificaciones` — llevan tokens vigentes. Entregarlos es
 *   entregar sesiones abiertas, no historia.
 * - `intentos_acceso` — es telemetria de seguridad de la plataforma, no
 *   registro del municipio.
 *
 * La bitacora si va: es la evidencia de quien hizo que, y es justamente lo
 * que un archivo municipal necesita conservar.
 */
const conjuntosDePlataforma = async (
  tx: TransaccionTenant,
): Promise<Record<string, readonly unknown[]>> => ({
  usuarios: await tx
    .select({
      id: usuarios.id,
      nombre: usuarios.name,
      email: usuarios.email,
      rol: usuarios.rol,
      bajaEn: usuarios.bajaEn,
      creadoEn: usuarios.createdAt,
    })
    .from(usuarios),
});

/**
 * Los conjuntos de la plataforma y los que aportan los modulos, en un solo
 * mapa. Sale de `exportarAyuntamiento` para que esa quede en el flujo y no
 * en el armado.
 */
const conjuntosDe = async (
  tx: TransaccionTenant,
  porciones: readonly PorcionExportable[],
): Promise<Record<string, readonly unknown[]>> => {
  const conjuntos: Record<string, readonly unknown[]> =
    await conjuntosDePlataforma(tx);

  for (const porcion of porciones) {
    conjuntos[porcion.nombre] = await porcion.leer(tx);
  }

  return conjuntos;
};

/**
 * El municipio del contexto, o falla.
 *
 * Se resuelve primero y aparte: el contexto se arma en servidor, asi que
 * un municipio ausente significa que se borro entre la resolucion del
 * tenant y esta consulta. Descubrirlo antes de leer nada evita recorrer
 * todas las porciones para despues tirar el trabajo.
 */
const municipioDe = async (
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
): Promise<Exportacion["ayuntamiento"]> => {
  const [municipio] = await tx
    .select({
      id: ayuntamientos.id,
      subdominio: ayuntamientos.subdominio,
      nombre: ayuntamientos.nombre,
    })
    .from(ayuntamientos)
    .where(eq(ayuntamientos.id, ayuntamientoId));

  if (!municipio) throw new TenantNoResueltoError();

  return municipio;
};

/**
 * @param porciones Lo que aportan los modulos. Se componen en `src/app`,
 *   que es la unica capa que conoce todos los modulos — `shared` no puede
 *   importarlos.
 */
export async function exportarAyuntamiento(
  contexto: ContextoActual,
  porciones: readonly PorcionExportable[],
): Promise<Exportacion> {
  if (!puedeExportar(contexto.usuario.rol)) throw new NoAutorizadoError();

  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const municipio = await municipioDe(tx, contexto.ayuntamientoId);
    const conjuntos = await conjuntosDe(tx, porciones);

    /**
     * La traza va en la misma transaccion que la lectura. Regla dura: no
     * hay exportacion masiva sin bitacora de acceso. Y al ir adentro, si
     * algo falla despues el ROLLBACK se la lleva — correcto, porque
     * entonces nadie se llevo nada.
     */
    await registrar(tx, {
      ayuntamientoId: contexto.ayuntamientoId,
      actor: contexto.usuario.id,
      origen: contexto.origen,
      accion: "EXPORTAR_AYUNTAMIENTO",
      entidad: "ayuntamientos",
      entidadId: contexto.ayuntamientoId,
    });

    return { generadaEn: new Date(), ayuntamiento: municipio, conjuntos };
  });
}
