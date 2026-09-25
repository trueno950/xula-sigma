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

const payloadsAmpliados = [
  { tipo: "reporte", id: randomUUID(), cambio: "estado" },
  { tipo: "intervencion", id: randomUUID(), cambio: "correccion" },
] as const;

describe("publicacion transaccional en el canal del tenant", () => {
  it("entrega una sola notificacion con el payload exacto al confirmar", async () => {
    const escucha = await abrirEscucha(motul);

    await withTenant(motul, (tx) => publicarActualizacion(tx, motul, payload));

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payload);
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it.each(payloadsAmpliados)(
    "entrega el payload exacto de $tipo al confirmar",
    async (ampliado) => {
      const escucha = await abrirEscucha(motul);

      await withTenant(motul, (tx) =>
        publicarActualizacion(tx, motul, ampliado),
      );

      const recibido: unknown = JSON.parse(await escucha.esperar());
      expect(recibido).toEqual(ampliado);
      await escucha.esperarSilencio();
      await escucha.cerrar();
    },
  );
});
