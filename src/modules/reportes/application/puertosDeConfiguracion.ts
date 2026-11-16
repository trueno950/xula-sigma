import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que los casos de uso del umbral de atraso necesitan de
 * `configuracion_de_reportes`: leerlo y reemplazarlo. Las dos operaciones
 * reciben la transaccion de `withTenant` por parametro y no la abren ellas
 * mismas -mismo criterio que `RepositorioDeDocumentos` de `constancias`-.
 *
 * Repositorio propio y no uno compartido con `marca` o `constancias`: el
 * umbral es de `reportes`, y una tabla de configuracion por modulo es la que
 * evita que un cambio de `constancias` toque la bandeja ciudadana.
 */
export type RepositorioDeConfiguracionDeReportes = {
  /**
   * El umbral guardado, o `null` si el ayuntamiento nunca lo configuro -un
   * municipio sin fila usa `UMBRAL_DE_ATRASO_POR_DEFECTO`, no un error-.
   */
  leer(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
  ): Promise<number | null>;

  /** Upsert sobre la PK: una fila por municipio, nunca un historial. */
  escribir(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    diasDeAtraso: number,
  ): Promise<void>;
};
