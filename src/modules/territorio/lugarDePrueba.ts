import type { ContextoActual } from "@/shared/auth/contexto";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type LugarId,
} from "./domain";
import { calles, domicilios, lugares } from "./infrastructure/esquema";

const exigirFila = <T>(fila: T | undefined): T => {
  if (!fila) throw new Error("La insercion de prueba no devolvio una fila");
  return fila;
};

/**
 * Helpers de integracion compartidos por los `*.integration.test.ts` de
 * `territorio` (precedente exacto: `padron/personaDePrueba.ts`). Cada
 * archivo repite su propio `beforeAll(sembrar)`/`afterAll(limpiar, ...)` -
 * lo que se comparte aca es solo la insercion contra Postgres real, no el
 * ciclo de vida de la base.
 */

export const contextoDe = (): ContextoActual => ({
  ayuntamientoId: motul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

export const crearLugar = (
  tipo: (typeof lugares.$inferInsert)["tipo"],
  nombre: string,
  padreId?: LugarId,
) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .insert(lugares)
      .values({ ayuntamientoId: motul, tipo, nombre, padreId })
      .returning({ id: lugares.id });
    return comoLugarId(exigirFila(fila).id);
  });

/** Igual que `crearLugar`, pero para cualquier municipio. */
export const crearLugarEn = (
  ayuntamientoId: AyuntamientoId,
  tipo: (typeof lugares.$inferInsert)["tipo"],
  nombre: string,
) =>
  withTenant(ayuntamientoId, async (tx) => {
    const [fila] = await tx
      .insert(lugares)
      .values({ ayuntamientoId, tipo, nombre })
      .returning({ id: lugares.id });
    return comoLugarId(exigirFila(fila).id);
  });

export const crearCalle = (lugarId: LugarId, nombre: string) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .insert(calles)
      .values({ ayuntamientoId: motul, nombre, lugarId })
      .returning({ id: calles.id });
    return comoCalleId(exigirFila(fila).id);
  });

/** Igual que `crearCalle`, pero para cualquier municipio. */
export const crearCalleEn = (
  ayuntamientoId: AyuntamientoId,
  lugarId: LugarId,
  nombre: string,
) =>
  withTenant(ayuntamientoId, async (tx) => {
    const [fila] = await tx
      .insert(calles)
      .values({ ayuntamientoId, nombre, lugarId })
      .returning({ id: calles.id });
    return comoCalleId(exigirFila(fila).id);
  });

export const crearDomicilio = (lugarId: LugarId, nombreCalle: string) =>
  withTenant(motul, async (tx) => {
    const [calle] = await tx
      .insert(calles)
      .values({ ayuntamientoId: motul, nombre: nombreCalle, lugarId })
      .returning({ id: calles.id });
    const calleCreada = exigirFila(calle);
    const [domicilio] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId: motul, lugarId, calleId: calleCreada.id })
      .returning({ id: domicilios.id });
    return comoDomicilioId(exigirFila(domicilio).id);
  });

/** Cuelga un domicilio de una `calleId` ya existente -precedente `crearDomicilio`, sin crear la calle-. */
export const crearDomicilioEnCalle = (
  lugarId: LugarId,
  calleId: CalleId,
  numero?: string,
) =>
  withTenant(motul, async (tx) => {
    const [domicilio] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId: motul, lugarId, calleId, numero })
      .returning({ id: domicilios.id });
    return comoDomicilioId(exigirFila(domicilio).id);
  });

/** Como `crearDomicilioEnCalle` pero para cualquier municipio, y sin `numero`: ningun test de aislamiento filtra por numero. */
export const crearDomicilioEnCalleEn = (
  ayuntamientoId: AyuntamientoId,
  lugarId: LugarId,
  calleId: CalleId,
) =>
  withTenant(ayuntamientoId, async (tx) => {
    const [domicilio] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId, lugarId, calleId })
      .returning({ id: domicilios.id });
    return comoDomicilioId(exigirFila(domicilio).id);
  });
