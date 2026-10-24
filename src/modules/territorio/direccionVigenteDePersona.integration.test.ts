import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona, fusionarPersonas } from "@/modules/padron";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { crearDireccionVigenteDePersona } from "./application/direccionVigenteDePersona";
import { crearReparentearLugar } from "./application/reparentearLugar";
import type { CalleId, DomicilioId, LugarId } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { lectorDeDireccionesSql } from "./infrastructure/lectorDeDireccionesSql";
import { crearLectorDePersonasPorPadron } from "./infrastructure/lectorDePersonasPorPadron";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const direccionVigenteDePersona = crearDireccionVigenteDePersona(
  repositorioDeResidenciasSql,
  lectorDeDireccionesSql,
  crearLectorDePersonasPorPadron,
);

const altaDeDomicilio = crearAltaDeDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);

const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);

const altaConNumero = (
  lugarId: LugarId,
  calleId: CalleId,
  numero: string | null,
) =>
  altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero,
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contextoDe(),
  );

const personaDePrueba = (nombres: string) =>
  altaDePersona(
    { nombres, primerApellido: "Pech", segundoApellido: null, curp: null },
    contextoDe(),
  );

const abrirResidencia = (
  personaId: string,
  domicilioId: DomicilioId,
  desdeEn: string,
) =>
  withTenant(motul, (tx) =>
    tx
      .insert(residencias)
      .values({ ayuntamientoId: motul, personaId, domicilioId, desdeEn })
      .returning(),
  );

describe("direccionVigenteDePersona: resolucion por fusion (spec residencias)", () => {
  it("resuelve la residencia mas reciente entre las dos identidades fusionadas, sin ejecutar su propia consulta contra residencias", async () => {
    const { id: personaA } = await personaDePrueba("Alicia");
    const { id: personaB } = await personaDePrueba("Betania");
    const comisaria = await crearLugar("comisaria", "Comisaria Fusion");
    const colonia = await crearLugar("colonia", "Colonia Fusion", comisaria);
    const calle = await crearCalle(comisaria, "Calle de la fusion");
    const { id: domicilioViejo } = await altaConNumero(colonia, calle, "1");
    const { id: domicilioNuevo } = await altaConNumero(colonia, calle, "2");
    await abrirResidencia(personaA, domicilioViejo, "2020-01-01");
    await abrirResidencia(personaB, domicilioNuevo, "2021-01-01");

    await fusionarPersonas(personaA, personaB, contextoDe());

    const direccion = await direccionVigenteDePersona(personaA, contextoDe());

    expect(direccion?.domicilioId).toBe(domicilioNuevo);
  });
});

describe("direccionVigenteDePersona: composicion del texto (spec domicilios)", () => {
  it("con todos los niveles presentes, el texto incluye la cadena completa de ancestros, calle, numero y ambas transversales", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Completa");
    const colonia = await crearLugar("colonia", "Colonia Completa", comisaria);
    const calle = await crearCalle(comisaria, "Calle Principal");
    const entreA = await crearCalle(comisaria, "Entre Calle A");
    const entreB = await crearCalle(comisaria, "Entre Calle B");
    const { id: domicilioId } = await altaDeDomicilio(
      {
        lugarId: colonia,
        calleId: calle,
        numero: "105",
        entreCalleAId: entreA,
        entreCalleBId: entreB,
        referencia: "Frente al parque",
      },
      contextoDe(),
    );
    const { id: personaId } = await personaDePrueba("Carmen");
    await abrirResidencia(personaId, domicilioId, "2022-01-01");

    const direccion = await direccionVigenteDePersona(personaId, contextoDe());

    expect(direccion?.texto).toContain("Calle Principal");
    expect(direccion?.texto).toContain("105");
    expect(direccion?.texto).toContain("Entre Calle A");
    expect(direccion?.texto).toContain("Entre Calle B");
    expect(direccion?.texto).toContain("Colonia Completa");
    expect(direccion?.texto).toContain("Comisaria Completa");
  });

  it("con niveles ausentes, el texto omite lo ausente sin fallar", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Sin Colonia");
    const calle = await crearCalle(comisaria, "Calle Suelta");
    const { id: domicilioId } = await altaConNumero(comisaria, calle, null);
    const { id: personaId } = await personaDePrueba("Daniela");
    await abrirResidencia(personaId, domicilioId, "2022-01-01");

    const direccion = await direccionVigenteDePersona(personaId, contextoDe());

    expect(direccion?.texto).toBe("Calle Suelta S/N, Comisaria Sin Colonia");
  });

  it("reparentear la colonia del domicilio refleja la jerarquia actual, no una copia congelada", async () => {
    const comisariaOrigen = await crearLugar("comisaria", "Comisaria Origen");
    const comisariaDestino = await crearLugar("comisaria", "Comisaria Destino");
    const colonia = await crearLugar(
      "colonia",
      "Colonia Movil",
      comisariaOrigen,
    );
    const calle = await crearCalle(comisariaOrigen, "Calle Movil");
    const { id: domicilioId } = await altaConNumero(colonia, calle, "50");
    const { id: personaId } = await personaDePrueba("Elisa");
    await abrirResidencia(personaId, domicilioId, "2022-01-01");

    const antes = await direccionVigenteDePersona(personaId, contextoDe());
    expect(antes?.texto).toContain("Comisaria Origen");

    await reparentearLugar(colonia, comisariaDestino, contextoDe());

    const despues = await direccionVigenteDePersona(personaId, contextoDe());
    expect(despues?.texto).toContain("Comisaria Destino");
    expect(despues?.texto).not.toContain("Comisaria Origen");
  });
});
