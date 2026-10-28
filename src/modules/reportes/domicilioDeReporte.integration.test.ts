import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  type CalleId,
  type DomicilioId,
  darDeBajaDomicilio,
  domicilioPorId,
  type LugarId,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import { anioEnMerida } from "@/shared/lib/fecha";
import { owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import {
  historialDeReporte,
  listarReportes,
  registrarReporte,
  reportePorId,
} from "./composicion";
import { UbicacionInvalidaError } from "./domain";

type Municipio = "motul" | "ticul";
type Entrada = Parameters<typeof registrarReporte>[0] & {
  domicilioId?: string;
};

let gente: GentePorMunicipio;
let lugarMotul: LugarId;
let calleMotul: CalleId;
let domicilioActivo: DomicilioId;
let domicilioInactivo: DomicilioId;
let domicilioTicul: DomicilioId;

const actor = (municipio: Municipio) =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const entrada = (
  lugarId?: string,
  calleId?: string | null,
  domicilioId?: string,
): Entrada => ({
  tipo: "BACHE",
  ...(lugarId ? { lugarId } : {}),
  ...(calleId !== undefined ? { calleId } : {}),
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
  ...(domicilioId ? { domicilioId } : {}),
});

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
      numero: "42",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  );
  return { lugarId, calleId, domicilioId };
};

const idsVisibles = async () =>
  (await listarReportes({}, actor("motul"))).reportes.map(({ id }) => id);

const rechazarSinEfectos = async (
  datos: Entrada,
  error: typeof NoEncontradoError | typeof UbicacionInvalidaError,
  folioSiguiente: number,
) => {
  const antes = await idsVisibles();
  await expect(registrarReporte(datos, actor("motul"))).rejects.toBeInstanceOf(
    error,
  );
  expect(await idsVisibles()).toEqual(antes);

  const legacyId = await registrarReporte(
    entrada(lugarMotul, calleMotul),
    actor("motul"),
  );
  expect((await reportePorId(legacyId, actor("motul")))?.folio).toBe(
    `REP-${anioEnMerida()}-${String(folioSiguiente).padStart(6, "0")}`,
  );
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  const motulDomicilio = await crearDomicilio(
    "motul",
    "Registro Domicilio T6a",
  );
  lugarMotul = motulDomicilio.lugarId;
  calleMotul = motulDomicilio.calleId;
  domicilioActivo = motulDomicilio.domicilioId;
  const inactivo = await crearDomicilio("motul", "Registro Baja T6a");
  domicilioInactivo = inactivo.domicilioId;
  await darDeBajaDomicilio(domicilioInactivo, actor("motul"));
  domicilioTicul = (await crearDomicilio("ticul", "Registro Ajeno T6a"))
    .domicilioId;
});

afterAll(async () => {
  await owner.end();
  await cerrarConexion();
});

describe("vinculo vivo de domicilio en reportes", () => {
  it("guarda el vinculo al domicilio activo y lo devuelve en la lectura del reporte", async () => {
    const id = await registrarReporte(
      entrada(undefined, undefined, domicilioActivo),
      actor("motul"),
    );
    const guardado = await reportePorId(id, actor("motul"));
    const direccion = await domicilioPorId(domicilioActivo, actor("motul"));

    expect(guardado).toMatchObject({
      domicilioId: domicilioActivo,
      lugarId: lugarMotul,
      calleId: calleMotul,
    });
    expect(direccion?.numero).toBe("42");
    expect(await historialDeReporte(id, actor("motul"))).toHaveLength(1);
  });

  it("un domicilio inexistente rechaza sin reporte ni folio y conserva la ruta por lugar/calle", async () => {
    await rechazarSinEfectos(
      entrada(lugarMotul, calleMotul, "00000000-0000-4000-8000-000000000000"),
      NoEncontradoError,
      2,
    );
  });

  it("un domicilio de otro tenant no se vincula ni consume folio", async () => {
    await rechazarSinEfectos(
      entrada(lugarMotul, calleMotul, domicilioTicul),
      NoEncontradoError,
      3,
    );
  });

  it("un domicilio dado de baja se ve como no encontrado y no consume folio", async () => {
    await rechazarSinEfectos(
      entrada(lugarMotul, calleMotul, domicilioInactivo),
      NoEncontradoError,
      4,
    );
  });

  it("rechaza si lugar o calle no coinciden con el domicilio autoritativo", async () => {
    await rechazarSinEfectos(
      entrada("00000000-0000-4000-8000-000000000000", null, domicilioActivo),
      UbicacionInvalidaError,
      5,
    );
  });
});
