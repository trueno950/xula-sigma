import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que el caso de uso necesita del almacen de assets. `guardar` devuelve
 * la URL, no la clave: armarla es conocimiento de infraestructura, sabe el
 * dominio publico. `borrar` recibe la URL guardada y no la clave, por
 * simetria — el adaptador es el unico que sabe mapear en las dos
 * direcciones.
 */
export type AlmacenDeAssets = {
  /** Devuelve la URL publica absoluta del objeto guardado. */
  guardar(clave: string, bytes: Uint8Array): Promise<string>;
  /**
   * Borra el objeto de `url`, pero solo si es del ayuntamiento que pide el
   * borrado. No-opera en dos casos, los dos de seguridad y no de
   * comodidad — la barrera exacta la implementa
   * `domain/claveDesdeUrl.ts#claveTenantDesdeUrl`, que todo adaptador
   * (real o de prueba) tiene que usar:
   *
   * 1. La URL no es de este almacen (origen distinto al dominio publico
   *    configurado, comparado como origen y no como prefijo de texto).
   * 2. La clave no empieza con el `ayuntamientoId` de quien pide el
   *    borrado.
   *
   * `marca.escudo` puede llevar cualquier URL http pegada a mano, y un
   * borrado que confiara solo en el prefijo de host habilitaria un DELETE
   * contra el objeto de otro municipio — el bucket es plano y RLS no
   * alcanza ahi, porque el DELETE corre fuera de Postgres.
   *
   * `ayuntamientoId` es `string` y no `AyuntamientoId` aca: el bucket no
   * tiene RLS que valide el formato, y esta clave es el mismo prefijo de
   * texto que arma `domain/claveDeEscudo.ts#claveDeEscudo`, ya `string`
   * por la misma razon.
   */
  borrar(ayuntamientoId: string, url: string): Promise<void>;
};

/**
 * Lo que el caso de uso necesita para leer y escribir `ayuntamientos.marca`
 * sin componer SQL a mano (antipatron 7 de `AGENTS.md`). Las dos
 * operaciones reciben la transaccion de `withTenant` por parametro y no la
 * abren ellas mismas: el UPDATE de `escribir` y el INSERT de la bitacora
 * tienen que confirmar juntos o fallar juntos, y eso solo es cierto si
 * corren dentro de la misma `tx` que orquesta `cambiarEscudo`.
 */
export type RepositorioDeMarca = {
  /**
   * El valor crudo de `marca` para ese ayuntamiento, o `null` si la fila
   * no existe. `null` sirve de centinela sin ambiguedad porque la columna
   * es `jsonb().notNull().default({})` (`esquema.ts`): un valor real nunca
   * es SQL NULL. No valida ni normaliza: `marca` sigue siendo `unknown`
   * de este lado, y quien pregunta decide que hacer con un valor que no es
   * un objeto plano.
   */
  leer(tx: TransaccionTenant, ayuntamientoId: AyuntamientoId): Promise<unknown>;
  /** Reemplaza `marca` entera para ese ayuntamiento, dentro de `tx`. */
  escribir(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    marca: Record<string, unknown>,
  ): Promise<void>;
};
