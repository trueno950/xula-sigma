import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { motul, ticul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";
import type { ContextoActual } from "./contexto";
import { ROLES, type Rol } from "./roles";

/**
 * Una persona de cada rol en cada municipio, para los tests de los casos de
 * uso de administracion.
 *
 * Los cuatro roles y no solo los que hacen falta: las reglas de `roles.ts`
 * se recorren enteras contra `ROLES`, y un caso de uso que las consume
 * merece el mismo trato. Sin el `SUPER_ADMIN` sembrado no habria con que
 * probar que nadie puede tocarlo.
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite. Vive al lado
 * de los tests que lo usan, igual que `datosDePrueba` y
 * `municipiosDePrueba`.
 */

export const CLAVE_INICIAL = "clave-larga-y-vieja";

export type Gente = Record<Rol, string>;
export type GentePorMunicipio = { motul: Gente; ticul: Gente };

async function sembrarMunicipio(
  ayuntamientoId: AyuntamientoId,
  etiqueta: string,
): Promise<Gente> {
  const gente = {} as Gente;

  for (const rol of ROLES) {
    const { id } = await withTenant(ayuntamientoId, (tx) =>
      altaDePersona(tx, ayuntamientoId, {
        nombre: `${rol} de ${etiqueta}`,
        email: `${rol.toLowerCase()}@${etiqueta}.example.com`,
        clave: CLAVE_INICIAL,
        rol,
      }),
    );

    gente[rol] = id;
  }

  return gente;
}

/**
 * Secuencial y no en paralelo, por la misma razon que `sembrarAuth`: la
 * suite de integracion corre con `DB_POOL_MAX=1`.
 */
export async function sembrarGente(): Promise<GentePorMunicipio> {
  return {
    motul: await sembrarMunicipio(motul, "motul"),
    ticul: await sembrarMunicipio(ticul, "ticul"),
  };
}

/** El contexto que devolveria `contextoActual()` para esa persona. */
export const contextoDe = (
  gente: GentePorMunicipio,
  municipio: keyof GentePorMunicipio,
  rol: Rol,
): ContextoActual => ({
  ayuntamientoId: municipio === "motul" ? motul : ticul,
  usuario: { id: gente[municipio][rol], rol },
  origen: `https://${municipio}.xulasigma.mx`,
});

/**
 * Devuelve el error en vez de dejarlo escapar, y falla si no hubo ninguno.
 *
 * El despacho se hace por `codigo` y no por `instanceof`: un error que
 * cruza un limite de modulo o se serializa hacia una Server Action pierde
 * su prototipo (ver `shared/lib/errores.ts`).
 */
export async function motivoDe(
  trabajo: () => Promise<unknown>,
): Promise<{ codigo?: string }> {
  try {
    await trabajo();
  } catch (error) {
    return error as { codigo?: string };
  }

  throw new Error("Se esperaba un fallo y la operacion salio bien.");
}
