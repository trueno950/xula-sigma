import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import {
  limpiar,
  motul,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import {
  cerrarHubDeNotificaciones,
  suscribirActualizaciones,
} from "./notificacionesDeTenant";
import { cerrarConexion, withTenant } from "./withTenant";

const ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await cerrarHubDeNotificaciones();
  await limpiar();
  await cerrarConexion();
});

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("hub LISTEN de actualizaciones", () => {
  it("reenvia solo el canal del tenant que confirmo la mutacion", async () => {
    const recibidos: string[] = [];
    const escuchaMotul = await suscribirActualizaciones(motul, (payload) =>
      recibidos.push(payload),
    );
    const escuchaTicul = await suscribirActualizaciones(ticul, () => {
      throw new Error("Ticul no debe recibir una actualizacion de Motul.");
    });

    await withTenant(motul, (tx) =>
      publicarActualizacion(tx, motul, {
        tipo: "calle",
        id: ID,
        cambio: "estructura",
      }),
    );
    await esperar(200);

    expect(recibidos).toEqual([
      JSON.stringify({ tipo: "calle", id: ID, cambio: "estructura" }),
    ]);
    await escuchaMotul.cerrar();
    await escuchaTicul.cerrar();
  });
});
