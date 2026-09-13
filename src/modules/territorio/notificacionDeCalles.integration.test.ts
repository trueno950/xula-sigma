import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { abrirEscucha } from "@/shared/notificaciones/escuchaDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearRenombrarCalle } from "./application/renombrarCalle";
import { crearUbicarCalle } from "./application/ubicarCalle";
import { altaDeCalle } from "./composicion";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { contextoDe, crearCalleEn, crearLugarEn } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);
const ubicarCalle = crearUbicarCalle(repositorioDeCallesSql);

const contextoDeTicul: ContextoActual = {
  ayuntamientoId: ticul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
};

const payloadDeCalle = (id: string) => ({
  tipo: "calle",
  id,
  cambio: "estructura",
});

describe("notificacion de cambios estructurales de calles", () => {
  it("un alta confirmada entrega una sola notificacion con la identidad", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Notifica alta");
    const escucha = await abrirEscucha(motul);
    const { id } = await altaDeCalle(
      { nombre: "Calle nueva", lugarId },
      contextoDe(),
    );

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDeCalle(id));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un renombre confirmado entrega una sola notificacion con la identidad", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Notifica renombre");
    const calleId = await crearCalleEn(motul, lugarId, "Calle que notifica");
    const escucha = await abrirEscucha(motul);

    await renombrarCalle(calleId, "Calle renombrada", contextoDe());

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDeCalle(calleId));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una mutacion revertida no entrega nada", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Notifica rollback");
    const calleId = await crearCalleEn(motul, lugarId, "Calle revertida");
    const escucha = await abrirEscucha(motul);
    const contextoInvalido: ContextoActual = {
      ...contextoDe(),
      usuario: { id: "no-es-un-uuid", rol: "ADMIN_MUNICIPAL" },
    };

    await expect(
      renombrarCalle(calleId, "Nombre nuevo", contextoInvalido),
    ).rejects.toThrow(/Failed query/i);

    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una calle de Ticul notifica a Ticul y no a Motul", async () => {
    const lugarId = await crearLugarEn(ticul, "comisaria", "Notifica ajeno");
    const calleId = await crearCalleEn(ticul, lugarId, "Calle de Ticul");
    const escuchaMotul = await abrirEscucha(motul);
    const escuchaTicul = await abrirEscucha(ticul);

    await ubicarCalle(calleId, null, contextoDeTicul);

    const recibido: unknown = JSON.parse(await escuchaTicul.esperar());
    expect(recibido).toEqual(payloadDeCalle(calleId));
    await escuchaMotul.esperarSilencio();
    await escuchaTicul.cerrar();
    await escuchaMotul.cerrar();
  });
});
