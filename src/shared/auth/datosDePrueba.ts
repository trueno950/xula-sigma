import { createHash, randomUUID } from "node:crypto";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { motul, ticul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  cuentas,
  intentosAcceso,
  sesiones,
  usuarios,
  verificaciones,
} from "./esquema";

/**
 * Siembra compartida de los cinco tests de aislamiento de auth.
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite. Vive al
 * lado de los tests que lo usan, igual que `municipiosDePrueba` en
 * `tenancy`.
 *
 * **El correo es el mismo en los dos municipios a proposito.** Ademas de
 * dejar los datos listos, ejercita el indice unico compuesto: si alguien lo
 * cambiara por un `unique()` global, la siembra misma reventaria y ningun
 * test llegaria a correr.
 */

export const CORREO_COMPARTIDO = "alguien@example.com";

export type SemillaAuth = {
  usuarioId: string;
  sesionId: string;
  sesionToken: string;
  cuentaId: string;
  verificacionId: string;
  verificacionIdentifier: string;
  intentoId: string;
  clave: string;
};

async function sembrarEn(
  ayuntamientoId: AyuntamientoId,
  etiqueta: string,
): Promise<SemillaAuth> {
  return withTenant(ayuntamientoId, async (tx) => {
    const [usuario] = await tx
      .insert(usuarios)
      .values({
        ayuntamientoId,
        name: `Persona de ${etiqueta}`,
        email: CORREO_COMPARTIDO,
        rol: "OPERADOR",
      })
      .returning({ id: usuarios.id });
    const usuarioId = usuario?.id as string;

    const sesionToken = `token-${etiqueta}-${randomUUID()}`;
    const [sesion] = await tx
      .insert(sesiones)
      .values({
        ayuntamientoId,
        userId: usuarioId,
        token: sesionToken,
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: sesiones.id });

    const [cuenta] = await tx
      .insert(cuentas)
      .values({
        ayuntamientoId,
        userId: usuarioId,
        accountId: usuarioId,
        providerId: "credential",
        password: `hash-falso-de-${etiqueta}`,
      })
      .returning({ id: cuentas.id });

    const verificacionIdentifier = `reset-password:${etiqueta}-${randomUUID()}`;
    const [verificacion] = await tx
      .insert(verificaciones)
      .values({
        ayuntamientoId,
        identifier: verificacionIdentifier,
        value: randomUUID(),
        expiresAt: new Date(Date.now() + 900_000),
      })
      .returning({ id: verificaciones.id });

    // Igual que en produccion: se guarda el hash, nunca el correo en claro.
    const clave = createHash("sha256")
      .update(`${CORREO_COMPARTIDO}:${etiqueta}`)
      .digest("hex");
    const [intento] = await tx
      .insert(intentosAcceso)
      .values({ ayuntamientoId, clave, tipo: "correo" })
      .returning({ id: intentosAcceso.id });

    return {
      usuarioId,
      sesionId: sesion?.id as string,
      sesionToken,
      cuentaId: cuenta?.id as string,
      verificacionId: verificacion?.id as string,
      verificacionIdentifier,
      intentoId: intento?.id as string,
      clave,
    };
  });
}

export type SemillasAuth = { enMotul: SemillaAuth; enTicul: SemillaAuth };

/**
 * Se corre despues de `sembrar()` de `municipiosDePrueba`: los municipios
 * tienen que existir antes, porque `ayuntamiento_id` los referencia.
 *
 * Secuencial y no en paralelo: la suite de integracion corre con
 * `DB_POOL_MAX=1`, asi que dos `withTenant` simultaneos se pelearian por la
 * unica conexion del pool.
 */
export async function sembrarAuth(): Promise<SemillasAuth> {
  const enMotul = await sembrarEn(motul, "motul");
  const enTicul = await sembrarEn(ticul, "ticul");
  return { enMotul, enTicul };
}
