import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDireccionesVigentesDePersonas } from "./application/direccionesVigentesDePersonas";
import type { DomicilioId } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { lectorDeDireccionesSql } from "./infrastructure/lectorDeDireccionesSql";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
import {
  contextoDe,
  crearCalle,
  crearCalleEn,
  crearDomicilioEnCalle,
  crearDomicilioEnCalleEn,
  crearLugar,
  crearLugarEn,
} from "./lugarDePrueba";

const direccionesVigentesDePersonas = crearDireccionesVigentesDePersonas(
  repositorioDeResidenciasSql,
  lectorDeDireccionesSql,
);

const contextoEn = (ayuntamientoId: typeof motul): ContextoActual => ({
  ayuntamientoId,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

const personaDePrueba = (nombres: string, contexto: ContextoActual) =>
  altaDePersona(
    { nombres, primerApellido: "Pech", segundoApellido: null, curp: null },
    contexto,
  );

const abrirResidencia = ({
  ayuntamientoId,
  personaId,
  domicilioId,
  desdeEn,
  hastaEn = null,
}: {
  ayuntamientoId: typeof motul;
  personaId: string;
  domicilioId: DomicilioId;
  desdeEn: string;
  hastaEn?: string | null;
}) =>
  withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(residencias)
      .values({ ayuntamientoId, personaId, domicilioId, desdeEn, hastaEn }),
  );

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("direccionesVigentesDePersonas", () => {
  it("etiqueta la residencia abierta con calle, numero, lugar y asentamiento, e ignora la cerrada", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Norte");
    const colonia = await crearLugar("colonia", "Colonia Centro", comisaria);
    const calle = await crearCalle(comisaria, "Calle 20");
    const viejo = await crearDomicilioEnCalle(colonia, calle, "5");
    const nuevo = await crearDomicilioEnCalle(colonia, calle, "42");
    const { id: personaId } = await personaDePrueba("Aurelia", contextoDe());

    await abrirResidencia({
      ayuntamientoId: motul,
      personaId: personaId,
      domicilioId: viejo,
      desdeEn: "2020-01-01",
      hastaEn: "2021-01-01",
    });
    await abrirResidencia({
      ayuntamientoId: motul,
      personaId: personaId,
      domicilioId: nuevo,
      desdeEn: "2022-01-01",
    });

    const direcciones = await direccionesVigentesDePersonas(
      [personaId],
      contextoDe(),
    );

    expect(direcciones.get(personaId)).toBe(
      "Calle 20 #42, Colonia Centro, Comisaria Norte",
    );
    expect(direcciones.get(personaId)).not.toContain("#5");
  });

  it("quien no tiene residencia abierta no aparece en el mapa", async () => {
    const { id: personaId } = await personaDePrueba("Berenice", contextoDe());

    const direcciones = await direccionesVigentesDePersonas(
      [personaId],
      contextoDe(),
    );

    expect(direcciones.has(personaId)).toBe(false);
  });
});

describe("direccionesVigentesDePersonas: aislamiento por municipio", () => {
  it("una persona de otro municipio nunca entra en el mapa, ni siquiera pedida por id en el mismo lote", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Propia");
    const calle = await crearCalle(comisaria, "Calle Propia");
    const domicilio = await crearDomicilioEnCalle(comisaria, calle, "100");
    const { id: personaMotul } = await personaDePrueba("Cecilia", contextoDe());
    await abrirResidencia({
      ayuntamientoId: motul,
      personaId: personaMotul,
      domicilioId: domicilio,
      desdeEn: "2022-01-01",
    });

    const lugarTicul = await crearLugarEn(
      ticul,
      "comisaria",
      "Comisaria Ajena",
    );
    const calleTicul = await crearCalleEn(ticul, lugarTicul, "Calle Ajena");
    const domicilioTicul = await crearDomicilioEnCalleEn(
      ticul,
      lugarTicul,
      calleTicul,
    );
    const { id: personaTicul } = await personaDePrueba(
      "Dolores",
      contextoEn(ticul),
    );
    await abrirResidencia({
      ayuntamientoId: ticul,
      personaId: personaTicul,
      domicilioId: domicilioTicul,
      desdeEn: "2022-01-01",
    });

    const desdeMotul = await direccionesVigentesDePersonas(
      [personaMotul, personaTicul],
      contextoDe(),
    );

    expect(desdeMotul.get(personaMotul)).toBe(
      "Calle Propia #100, Comisaria Propia",
    );
    expect(desdeMotul.has(personaTicul)).toBe(false);
    expect([...desdeMotul.values()].join(" ")).not.toContain("Ajena");
  });
});
