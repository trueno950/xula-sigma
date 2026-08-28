import type { ContextoActual } from "@/shared/auth/contexto";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { comoDomicilioId, comoLugarId, type LugarId } from "./domain";
import { calles, domicilios, lugares } from "./infrastructure/esquema";

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
    return comoLugarId(fila!.id);
  });

export const crearDomicilio = (lugarId: LugarId, nombreCalle: string) =>
  withTenant(motul, async (tx) => {
    const [calle] = await tx
      .insert(calles)
      .values({ ayuntamientoId: motul, nombre: nombreCalle, lugarId })
      .returning({ id: calles.id });
    const [domicilio] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId: motul, lugarId, calleId: calle!.id })
      .returning({ id: domicilios.id });
    return comoDomicilioId(domicilio!.id);
  });
