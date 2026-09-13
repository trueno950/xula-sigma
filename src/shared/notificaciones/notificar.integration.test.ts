import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { abrirEscucha } from "./escuchaDePrueba";
import { publicarActualizacion } from "./notificar";

/**
 * Transporte real de la publicacion con LISTEN crudo. Las mutaciones de
 * calle -confirmada, revertida y de otro tenant- se prueban en
 * `territorio` (`notificacionDeCalles.integration.test.ts`).
 */

const motul = comoAyuntamientoId(randomUUID());
const payload = {
  tipo: "calle",
  id: randomUUID(),
  cambio: "estructura",
} as const;

afterAll(async () => {
  await cerrarConexion();
});

describe("publicacion transaccional en el canal del tenant", () => {
  it("entrega una sola notificacion con el payload exacto al confirmar", async () => {
    const escucha = await abrirEscucha(motul);

    await withTenant(motul, (tx) => publicarActualizacion(tx, motul, payload));

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payload);
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });
});
