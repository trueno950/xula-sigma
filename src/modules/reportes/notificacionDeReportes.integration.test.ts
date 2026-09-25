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
  asignarAreaDeReporte,
  cambiarEstadoDeReporte,
  registrarReporte,
} from "./composicion";

/**
 * Publicacion real de `reportes` (D1/D2 de `mapa-operativo-territorial`):
 * el NOTIFY sale del caso de uso, dentro de la transaccion, y Postgres lo
 * entrega al COMMIT y solo al canal del tenant. La forma del payload y el
 * orden dentro del caso de uso se prueban en `publicacionDeReportes.test.ts`.
 */

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, folios_de_reportes, reportes, movimientos_de_reportes, intervenciones`;
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

const entrada = (lugarId: string) => ({
  tipo: "BACHE" as const,
  lugarId,
  calleId: null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
});

const reporteRegistrado = async () => {
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre: "Comisaria Notifica Reportes", padreId: null },
    admin(),
  );
  return { lugarId, id: await registrarReporte(entrada(lugarId), admin()) };
};

const payloadDe = (id: string, cambio: "alta" | "estado" | "area") => ({
  tipo: "reporte",
  id,
  cambio,
});

describe("notificacion de mutaciones de reportes", () => {
  it("un alta confirmada entrega una sola notificacion con la identidad", async () => {
    const { id: lugarId } = await altaDeLugar(
      { tipo: "comisaria", nombre: "Comisaria Notifica Alta", padreId: null },
      admin(),
    );
    const escucha = await abrirEscucha(motul);

    const id = await registrarReporte(entrada(lugarId), admin());

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "alta"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un cambio de estado confirmado entrega {reporte, id, estado}", async () => {
    const { id } = await reporteRegistrado();
    const escucha = await abrirEscucha(motul);

    await cambiarEstadoDeReporte(
      {
        id,
        estadoNuevo: "EN_ATENCION",
        motivoDeRechazo: null,
        duplicadoDe: null,
      },
      admin(),
    );

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "estado"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una asignacion de area confirmada entrega {reporte, id, area}", async () => {
    const { id } = await reporteRegistrado();
    const escucha = await abrirEscucha(motul);

    await asignarAreaDeReporte(
      { id, areaResponsable: "OBRAS_PUBLICAS" },
      admin(),
    );

    const recibido: unknown = JSON.parse(await escucha.esperar());
    expect(recibido).toEqual(payloadDe(id, "area"));
    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un alta revertida no entrega nada", async () => {
    const { id: lugarId } = await altaDeLugar(
      {
        tipo: "comisaria",
        nombre: "Comisaria Notifica Rollback",
        padreId: null,
      },
      admin(),
    );
    const escucha = await abrirEscucha(motul);

    await expect(
      registrarReporte(entrada(lugarId), contextoConActorInvalido()),
    ).rejects.toThrow(/Failed query/i);

    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("un cambio de estado revertido no entrega nada", async () => {
    const { id } = await reporteRegistrado();
    const escucha = await abrirEscucha(motul);

    await expect(
      cambiarEstadoDeReporte(
        {
          id,
          estadoNuevo: "EN_ATENCION",
          motivoDeRechazo: null,
          duplicadoDe: null,
        },
        contextoConActorInvalido(),
      ),
    ).rejects.toThrow(/Failed query/i);

    await escucha.esperarSilencio();
    await escucha.cerrar();
  });

  it("una mutacion de Motul no llega al canal de Ticul", async () => {
    const { id } = await reporteRegistrado();
    const escuchaMotul = await abrirEscucha(motul);
    const escuchaTicul = await abrirEscucha(ticul);

    await asignarAreaDeReporte(
      { id, areaResponsable: "OBRAS_PUBLICAS" },
      admin(),
    );

    const recibido: unknown = JSON.parse(await escuchaMotul.esperar());
    expect(recibido).toEqual(payloadDe(id, "area"));
    await escuchaTicul.esperarSilencio();
    await escuchaMotul.cerrar();
    await escuchaTicul.cerrar();
  });
});
