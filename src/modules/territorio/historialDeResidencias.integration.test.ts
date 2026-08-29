import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  altaDePersona,
  fusionarPersonas,
  revertirFusion,
} from "@/modules/padron";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearHistorialDeResidencias } from "./application/historialDeResidencias";
import type { DomicilioId } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { crearLectorDePersonasPorPadron } from "./infrastructure/lectorDePersonasPorPadron";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const historialDeResidencias = crearHistorialDeResidencias(
  repositorioDeResidenciasSql,
  crearLectorDePersonasPorPadron,
);

const personaDePrueba = (nombres: string) =>
  altaDePersona(
    { nombres, primerApellido: "Chi", segundoApellido: null, curp: null },
    contextoDe(),
  );

const domicilioDePrueba = async (nombreCalle: string) => {
  const lugar = await crearLugar("colonia", `Colonia de ${nombreCalle}`);
  return crearDomicilio(lugar, nombreCalle);
};

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

describe("historialDeResidencias: colapso de una identidad fusionada", () => {
  it("el historial por el id de la perdedora devuelve las residencias de ambas identidades", async () => {
    const { id: personaA } = await personaDePrueba("Ana");
    const { id: personaB } = await personaDePrueba("Beatriz");
    const domicilioA = await domicilioDePrueba("Calle de Ana");
    const domicilioB = await domicilioDePrueba("Calle de Beatriz");
    await abrirResidencia(personaA, domicilioA, "2020-01-01");
    await abrirResidencia(personaB, domicilioB, "2021-01-01");

    await fusionarPersonas(personaA, personaB, contextoDe());

    const historial = await historialDeResidencias(personaA, contextoDe());

    expect(historial.map((r) => r.domicilioId).sort()).toEqual(
      [domicilioA, domicilioB].sort(),
    );
  });

  it("el historial por el id de la ganadora tambien devuelve las de la perdedora", async () => {
    const { id: personaC } = await personaDePrueba("Carla");
    const { id: personaD } = await personaDePrueba("Diana");
    const domicilioC = await domicilioDePrueba("Calle de Carla");
    const domicilioD = await domicilioDePrueba("Calle de Diana");
    await abrirResidencia(personaC, domicilioC, "2020-01-01");
    await abrirResidencia(personaD, domicilioD, "2021-01-01");

    await fusionarPersonas(personaC, personaD, contextoDe());

    const historial = await historialDeResidencias(personaD, contextoDe());

    expect(historial.map((r) => r.domicilioId).sort()).toEqual(
      [domicilioC, domicilioD].sort(),
    );
  });

  it("con residencias abiertas en ambas identidades, la vigente es la de fecha mas reciente y la otra sigue en el historial", async () => {
    const { id: personaE } = await personaDePrueba("Elena");
    const { id: personaF } = await personaDePrueba("Fatima");
    const domicilioViejo = await domicilioDePrueba("Calle 1 de marzo");
    const domicilioNuevo = await domicilioDePrueba("Calle 10 de marzo");
    await abrirResidencia(personaE, domicilioViejo, "2020-03-01");
    await abrirResidencia(personaF, domicilioNuevo, "2020-03-10");

    await fusionarPersonas(personaE, personaF, contextoDe());

    const historial = await historialDeResidencias(personaE, contextoDe());
    const vigente = historial.find((r) => r.hastaEn === null);

    expect(vigente?.domicilioId).toBe(domicilioNuevo);
    expect(historial.map((r) => r.domicilioId)).toContain(domicilioViejo);
  });

  it("revertir la fusion deja el historial de la perdedora solo con las suyas, sin reescribir ninguna fila de residencias", async () => {
    const { id: personaG } = await personaDePrueba("Gaby");
    const { id: personaH } = await personaDePrueba("Herminia");
    const domicilioG = await domicilioDePrueba("Calle de Gaby");
    const domicilioH = await domicilioDePrueba("Calle de Herminia");
    await abrirResidencia(personaG, domicilioG, "2020-01-01");
    await abrirResidencia(personaH, domicilioH, "2021-01-01");

    const filasAntes = await withTenant(motul, (tx) =>
      tx.select().from(residencias).where(eq(residencias.personaId, personaG)),
    );

    await fusionarPersonas(personaG, personaH, contextoDe());
    await revertirFusion(personaG, contextoDe());

    const historial = await historialDeResidencias(personaG, contextoDe());
    const filasDespues = await withTenant(motul, (tx) =>
      tx.select().from(residencias).where(eq(residencias.personaId, personaG)),
    );

    expect(historial.map((r) => r.domicilioId)).toEqual([domicilioG]);
    expect(filasDespues).toEqual(filasAntes);
  });
});
