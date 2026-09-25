import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { canalDeTenant } from "@/shared/notificaciones/canales";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import {
  appSinTenant,
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

  it("avisa la reconexion cuando cae la sesion LISTEN y vuelve a entregar despues", async () => {
    const recibidos: string[] = [];
    const reconexiones = vi.fn();
    const escucha = await suscribirActualizaciones(
      motul,
      (payload) => recibidos.push(payload),
      reconexiones,
    );
    expect(reconexiones).not.toHaveBeenCalled();

    await terminarSesionListen(canalDeTenant(motul));
    await vi.waitFor(() => expect(reconexiones).toHaveBeenCalledTimes(1), {
      timeout: 10_000,
    });
    await withTenant(motul, (tx) =>
      publicarActualizacion(tx, motul, {
        tipo: "calle",
        id: ID,
        cambio: "estructura",
      }),
    );
    await vi.waitFor(() =>
      expect(recibidos).toEqual([
        JSON.stringify({ tipo: "calle", id: ID, cambio: "estructura" }),
      ]),
    );

    await escucha.cerrar();
  });

  it("no duplica payloads ni avisos tras cerrar y reabrir un canal reconectado", async () => {
    const primera = await suscribirActualizaciones(motul, vi.fn());
    await terminarSesionListen(canalDeTenant(motul));
    await esperarSesionListen(canalDeTenant(motul));
    await primera.cerrar();

    const recibidos: string[] = [];
    const reconexiones = vi.fn();
    const segunda = await suscribirActualizaciones(
      motul,
      (payload) => recibidos.push(payload),
      reconexiones,
    );
    await withTenant(motul, (tx) =>
      publicarActualizacion(tx, motul, {
        tipo: "calle",
        id: ID,
        cambio: "estructura",
      }),
    );
    await esperar(300);
    await terminarSesionListen(canalDeTenant(motul));
    await vi.waitFor(() => expect(reconexiones).toHaveBeenCalled(), {
      timeout: 10_000,
    });
    await esperar(300);

    expect(recibidos).toHaveLength(1);
    expect(reconexiones).toHaveBeenCalledTimes(1);
    await segunda.cerrar();
  });
});

async function esperarSesionListen(canal: string): Promise<void> {
  await vi.waitFor(async () => {
    const filas = await appSinTenant<{ total: number }[]>`
      SELECT count(*)::int AS total
      FROM pg_stat_activity
      WHERE usename = current_user AND query = ${`listen "${canal}"`}`;
    expect(filas).toEqual([{ total: 1 }]);
  });
}

async function terminarSesionListen(canal: string): Promise<void> {
  const sesiones = await appSinTenant<{ terminada: boolean }[]>`
    SELECT pg_terminate_backend(pid) AS terminada
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND usename = current_user
      AND pid <> pg_backend_pid()
      AND query = ${`listen "${canal}"`}`;
  expect(sesiones).toEqual([{ terminada: true }]);
}
