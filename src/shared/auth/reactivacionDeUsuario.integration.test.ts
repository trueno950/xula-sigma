import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { verificarClave } from "./contrasenia";
import { sesiones } from "./esquema";
import { motivoDe } from "./genteDePrueba";
import {
  CLAVE_DE_LA_PERSONA,
  contextoDeActor,
  credencialDe,
  darDeBaja,
  filaDe,
  TEMPORAL_NUEVA,
  trazasDe,
  unaPersona,
} from "./reactivacionDePrueba";
import { CuentaActivaError, reactivarUsuario } from "./reactivacionDeUsuario";

/**
 * S3 contra Postgres, en el camino que funciona: reactivar devuelve la cuenta
 * al panel con una temporal nueva, la clave anterior deja de servir, las
 * sesiones que sobrevivieron se revocan y queda la traza —todo en la misma
 * transaccion—.
 *
 * Las guardas —rol, 404 para otro municipio, la propia cuenta y lo que no
 * esta de baja— viven en `reactivacionGuardas.integration.test.ts`: son otra
 * decision y se leen mejor enteras.
 *
 * El acceso con la temporal nueva, S2 y S1, esta en
 * `reactivacionAcceso.integration.test.ts`, que necesita mockear
 * `next/headers`.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("reactivarUsuario", () => {
  it("devuelve la cuenta al panel con una temporal nueva y sin la clave anterior", async () => {
    const { id } = await unaPersona();

    await darDeBaja(motul, id);
    await reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
      usuarioId: id,
      nuevaClave: TEMPORAL_NUEVA,
    });

    const credencial = await credencialDe(motul, id);

    expect((await filaDe(motul, id))?.bajaEn).toBeNull();
    // S1: la marca es lo que la hace caducar y obligar al cambio.
    expect(credencial?.claveTemporalEn).toBeInstanceOf(Date);
    expect(
      await verificarClave(credencial?.password ?? "", TEMPORAL_NUEVA),
    ).toBe(true);
    // S3: «la contraseña anterior no vuelve a servir».
    expect(
      await verificarClave(credencial?.password ?? "", CLAVE_DE_LA_PERSONA),
    ).toBe(false);
  });

  it("revoca las sesiones que hubieran sobrevivido a la baja", async () => {
    const { id } = await unaPersona();

    await darDeBaja(motul, id);
    await withTenant(motul, (tx) =>
      tx.insert(sesiones).values({
        ayuntamientoId: motul,
        userId: id,
        token: `token-reactiva-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      }),
    );

    await reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
      usuarioId: id,
      nuevaClave: TEMPORAL_NUEVA,
    });

    const vivas = await withTenant(motul, (tx) =>
      tx
        .select({ token: sesiones.token })
        .from(sesiones)
        .where(eq(sesiones.userId, id)),
    );

    expect(vivas).toEqual([]);
  });

  it("deja la traza de la reactivacion, y no datos de la persona", async () => {
    const { id } = await unaPersona();

    await darDeBaja(motul, id);
    await reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
      usuarioId: id,
      nuevaClave: TEMPORAL_NUEVA,
    });

    const trazas = await trazasDe(motul, id);

    expect(trazas.map((traza) => traza.accion)).toEqual([
      "BAJA_USUARIO",
      "REACTIVAR_USUARIO",
    ]);
    expect(trazas[1]?.entidad).toBe("usuarios");
  });

  it("una cuenta activa no se reactiva, y no se toca su credencial", async () => {
    const { id } = await unaPersona();
    const antes = await credencialDe(motul, id);

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo).toBeInstanceOf(CuentaActivaError);
    expect(fallo.codigo).toBe("CUENTA_ACTIVA");
    expect((await credencialDe(motul, id))?.password).toBe(antes?.password);
    await expect(trazasDe(motul, id)).resolves.toHaveLength(0);
  });
});
