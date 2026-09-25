import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { abrirEscucha } from "@/shared/notificaciones/escuchaDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  cambiarEstadoDeIntervencion,
  corregirIntervencion,
  registrarIntervencion,
} from "./composicion";

/**
 * Publicacion real de `intervenciones` (D1/D2 de
 * `mapa-operativo-territorial`): el NOTIFY sale del caso de uso, dentro de
 * la transaccion, y Postgres lo entrega al COMMIT y solo al canal del
 * tenant. La forma del payload y el orden dentro del caso de uso se prueban
 * en `publicacionDeIntervenciones.test.ts`.
 */

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const admin = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
const contextoConActorInvalido = () => ({
  ...admin(),
  usuario: { id: "actor-no-uuid", rol: "ADMIN_MUNICIPAL" as const },
});

const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    admin(),
  );
  return id;
};

const entrada = (lugarId: string) => ({
  tipo: "OBRA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId,
  calleId: null,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
});

const payloadDe = (id: string, cambio: "alta" | "estado" | "correccion") => ({
  tipo: "intervencion",
  id,
  cambio,
});

describe("notificacion de mutaciones de intervenciones", () => {
  it("un alta confirmada entrega una sola notificacion con la identidad", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Alta Intervencion");
    const escucha = await abrirEscucha(motul);

    const id = await registrarIntervencion(entrada(lugarId), admin());

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "alta"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un cambio de estado confirmado entrega {intervencion, id, estado}", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Estado Intervencion");
    const id = await registrarIntervencion(entrada(lugarId), admin());
    const escucha = await abrirEscucha(motul);

    await cambiarEstadoDeIntervencion(
      { id, estadoNuevo: "EN_EJECUCION" },
      admin(),
    );

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "estado"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una correccion confirmada entrega {intervencion, id, correccion}", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Correccion");
    const id = await registrarIntervencion(entrada(lugarId), admin());
    const escucha = await abrirEscucha(motul);

    await corregirIntervencion(
      { ...entrada(lugarId), id, tipo: "MEJORA" },
      admin(),
    );

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "correccion"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un alta revertida no entrega nada", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Rollback Alta");
    const escucha = await abrirEscucha(motul);

    await expect(
      registrarIntervencion(entrada(lugarId), contextoConActorInvalido()),
    ).rejects.toThrow(/Failed query/i);

    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un cambio de estado revertido no entrega nada", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Rollback Estado");
    const id = await registrarIntervencion(entrada(lugarId), admin());
    const escucha = await abrirEscucha(motul);

    await expect(
      cambiarEstadoDeIntervencion(
        { id, estadoNuevo: "EN_EJECUCION" },
        contextoConActorInvalido(),
      ),
    ).rejects.toThrow(/Failed query/i);

    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una mutacion de Motul no llega al canal de Ticul", async () => {
    const lugarId = await lugarDe("Comisaria Notifica Aislamiento");
    const escuchaMotul = await abrirEscucha(motul);
    const escuchaTicul = await abrirEscucha(ticul);

    const id = await registrarIntervencion(entrada(lugarId), admin());

    const recibido: unknown = JSON.parse(await escuchaMotul.esperar());
    expect(recibido).toEqual(payloadDe(id, "alta"));
    await escuchaTicul.esperarSilencio();
    await escuchaMotul.cerrar();
    await escuchaTicul.cerrar();
  });
});
