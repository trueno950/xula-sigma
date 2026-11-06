import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  type CalleId,
  type DomicilioId,
  type LugarId,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import { anioEnMerida } from "@/shared/lib/fecha";
import {
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { listarReportes, registrarReporte, reportePorId } from "./composicion";
import { reportes } from "./infrastructure/esquema";
import { crearLectorDeDomiciliosPorTerritorio } from "./infrastructure/lectorDeDomiciliosPorTerritorio";
import { reporteDe } from "./reporteDePrueba";

type Municipio = "motul" | "ticul";
let gente: GentePorMunicipio;
let lugarMotul: LugarId;
let calleMotul: CalleId;
let domicilioTicul: DomicilioId;
let lugarTicul: LugarId;

const actor = (municipio: Municipio) =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const crearDomicilio = async (municipio: Municipio, nombre: string) => {
  const contexto = actor(municipio);
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: `Calle ${nombre}`, lugarId },
    contexto,
  );
  const { id: domicilioId } = await altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero: "7",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  );
  return { lugarId, calleId, domicilioId };
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  const ticulDomicilio = await crearDomicilio("ticul", "Domicilio Ajeno T6a");
  domicilioTicul = ticulDomicilio.domicilioId;
  lugarTicul = ticulDomicilio.lugarId;
  const motulDomicilio = await crearDomicilio("motul", "Domicilio Propio T6a");
  lugarMotul = motulDomicilio.lugarId;
  calleMotul = motulDomicilio.calleId;
});

afterAll(async () => {
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento del domicilio vinculado al reporte", () => {
  it("el lector de territorio solo resuelve el domicilio dentro de su tenant", async () => {
    const propio = await crearLectorDeDomiciliosPorTerritorio(
      actor("ticul"),
    ).porId(domicilioTicul);
    const ajeno = await crearLectorDeDomiciliosPorTerritorio(
      actor("motul"),
    ).porId(domicilioTicul);

    expect(propio).toEqual({
      lugarId: lugarTicul,
      calleId: expect.any(String),
    });
    expect(ajeno).toBeNull();
  });

  it("un id ajeno no crea reporte ni consume folio en el tenant solicitante", async () => {
    const entrada = {
      tipo: "BACHE" as const,
      lugarId: lugarMotul,
      calleId: calleMotul,
      referencia: null,
      descripcion: "Bache en la via publica del municipio",
      personaId: null,
      domicilioId: domicilioTicul,
    };
    const antes = (await listarReportes({}, actor("motul"))).reportes.map(
      ({ id }) => id,
    );

    await expect(
      registrarReporte(entrada, actor("motul")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(
      (await listarReportes({}, actor("motul"))).reportes.map(({ id }) => id),
    ).toEqual(antes);
    const id = await registrarReporte(
      { ...entrada, domicilioId: undefined },
      actor("motul"),
    );
    expect((await reportePorId(id, actor("motul")))?.folio).toBe(
      `REP-${anioEnMerida()}-000001`,
    );
  });

  it("el FK compuesto impide persistir un domicilio de otro tenant", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(reportes).values(
          reporteDe({
            ayuntamientoId: motul,
            lugarId: lugarMotul,
            domicilioId: domicilioTicul,
            registradoPorUsuarioId: gente.motul.OPERADOR,
            folio: "REP-2099-999999",
            consecutivo: 999999,
          }),
        ),
      ),
    );

    expect(motivo).toMatch(/reportes_domicilio_tenant_fk/i);
  });
});
