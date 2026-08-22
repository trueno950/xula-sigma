import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que `padron` necesita para expandir abreviaturas antes de normalizar
 * un nombre. El dominio no lo pide como tabla sino como mapa ya resuelto:
 * `normalizarParaBusqueda` recibe un `ReadonlyMap` y no sabe que existe
 * Postgres.
 *
 * Recibe la transaccion por parametro y no la abre: la lectura del
 * catalogo tiene que correr dentro de la misma `tx` que el INSERT de la
 * persona, porque la columna normalizada se calcula con lo que este
 * catalogo devuelva y las dos cosas confirman juntas o fallan juntas.
 */
export type CatalogoDeAbreviaturas = {
  leer(tx: TransaccionTenant): Promise<ReadonlyMap<string, string>>;
};
