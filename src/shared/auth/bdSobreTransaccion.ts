import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Enruta TODA operacion de Better Auth a la transaccion ambiente.
 *
 * `transaction` no abre una nueva: reusa la misma, porque ya estamos
 * adentro de una con el tenant fijado. Anidar abriria una sin `app.tenant`.
 *
 * El spike probo por que hace falta interceptar todo y no solo
 * `transaction`: con `transaction: true` el adaptador enruta por la
 * transaccion las mutaciones, pero **las lecturas no** — `findOne` usa
 * `db.select(...)` directo (`drizzle-adapter/dist/index.mjs:377` en
 * 1.6.29), que es justo el camino del acceso. Leer el codigo no alcanzo
 * para verlo; hizo falta correrlo.
 *
 * Los metodos se devuelven ligados a `tx` y no al Proxy: drizzle usa
 * campos privados de clase, y un metodo invocado con `this` apuntando al
 * Proxy revienta al leerlos.
 */
export function bdSobreTransaccion(tx: TransaccionTenant): TransaccionTenant {
  return new Proxy(tx, {
    get(_objetivo, prop) {
      if (prop === "transaction") {
        return (trabajo: (t: TransaccionTenant) => Promise<unknown>) =>
          trabajo(tx);
      }
      const valor = Reflect.get(tx, prop, tx);
      return typeof valor === "function" ? valor.bind(tx) : valor;
    },
  });
}
