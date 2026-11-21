import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { bitacora } from "@/shared/tenancy/esquema";
import { motul, type ticul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";
import { darDeBajaUsuario } from "./bajaDeUsuario";
import type { ContextoActual } from "./contexto";
import { cuentas, usuarios } from "./esquema";
import type { Rol } from "./roles";

/**
 * La siembra de los dos tests de la reactivacion (S3), y de nadie mas.
 *
 * Vive aparte porque el caso de uso y el acceso son dos archivos —el segundo
 * necesita mockear `next/headers`— y los dos parten del mismo estado: una
 * persona activa, su baja y el contexto del administrador que la reactiva.
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite. Mismo criterio
 * que `datosDePrueba` y `genteDePrueba`.
 */

/** La clave que la persona tenia antes de la baja: no puede volver a servir. */
export const CLAVE_DE_LA_PERSONA = "clave-larga-y-vieja";

/** La que emite la reactivacion, con la forma que genera `generarClaveTemporal`. */
export const TEMPORAL_NUEVA = "temporal-nueva-larga";

export type MunicipioDePrueba = typeof motul | typeof ticul;

/** El contexto que devolveria `contextoActual()` para quien reactiva. */
export const contextoDeActor = (
  ayuntamientoId: MunicipioDePrueba,
  rol: Rol,
  usuarioId: string = randomUUID(),
): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: usuarioId, rol },
  origen: "https://motul.xulasigma.mx",
});

let siguiente = 0;

/** Una persona nueva por caso: los tests comparten la base, no el sujeto. */
export const unaPersona = async (
  ayuntamientoId: MunicipioDePrueba = motul,
): Promise<{ id: string; email: string }> => {
  siguiente += 1;
  const email = `reactiva-${siguiente}@example.com`;

  const { id } = await withTenant(ayuntamientoId, (tx) =>
    altaDePersona(tx, ayuntamientoId, {
      nombre: `Persona ${siguiente}`,
      email,
      clave: CLAVE_DE_LA_PERSONA,
      rol: "OPERADOR",
    }),
  );

  return { id, email };
};

export const filaDe = (ayuntamientoId: MunicipioDePrueba, usuarioId: string) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
  ).then(([fila]) => fila);

export const credencialDe = (
  ayuntamientoId: MunicipioDePrueba,
  usuarioId: string,
) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

export const trazasDe = (
  ayuntamientoId: MunicipioDePrueba,
  usuarioId: string,
) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.select().from(bitacora).where(eq(bitacora.entidadId, usuarioId)),
  );

export const darDeBaja = (
  ayuntamientoId: MunicipioDePrueba,
  usuarioId: string,
) =>
  darDeBajaUsuario(contextoDeActor(ayuntamientoId, "ADMIN_MUNICIPAL"), {
    usuarioId,
  });

/** Pone la cuenta en un estado que el panel no produce —ver `Baja` de ops—. */
export const marcarBajaDirecta = (
  ayuntamientoId: MunicipioDePrueba,
  usuarioId: string,
) =>
  withTenant(ayuntamientoId, (tx) =>
    tx
      .update(usuarios)
      .set({ bajaEn: new Date() })
      .where(eq(usuarios.id, usuarioId)),
  );
