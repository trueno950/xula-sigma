import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona, fusionarPersonas } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { residentesDeDomicilio } from "./composicion";
import type { DomicilioId } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const personaDePrueba = (nombres: string, primerApellido: string) =>
  altaDePersona(
    { nombres, primerApellido, segundoApellido: null, curp: null },
    contextoDe(),
  );

const abrirResidencia = (personaId: string, domicilioId: DomicilioId) =>
  withTenant(motul, (tx) =>
    tx.insert(residencias).values({
      ayuntamientoId: motul,
      personaId,
      domicilioId,
      desdeEn: "2024-01-01",
    }),
  );

const contextoDeTicul = (): ContextoActual => ({
  ...contextoDe(),
  ayuntamientoId: ticul,
});

describe("residentesDeDomicilio contra Postgres", () => {
  it("lista a los residentes vigentes por nombre, con una pareja fusionada una sola vez", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Residentes");
    const domicilioId = await crearDomicilio(comisaria, "Calle Residentes");
    const perdedora = await personaDePrueba("Rosa", "Pech");
    const ganadora = await personaDePrueba("Rosa Maria", "Pech");
    const otra = await personaDePrueba("Ana", "Can");
    // Datos viejos: las dos identidades quedaron con su residencia abierta.
    await abrirResidencia(perdedora.id, domicilioId);
    await abrirResidencia(ganadora.id, domicilioId);
    await abrirResidencia(otra.id, domicilioId);
    await fusionarPersonas(perdedora.id, ganadora.id, contextoDe());

    const residentes = await residentesDeDomicilio(domicilioId, contextoDe());

    expect(residentes).toEqual([
      { personaId: otra.id, nombreCompleto: "Ana Can" },
      { personaId: ganadora.id, nombreCompleto: "Rosa Maria Pech" },
    ]);
  });

  it("el domicilio de otro municipio no devuelve a nadie", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria Aislada");
    const domicilioId = await crearDomicilio(comisaria, "Calle Aislada");
    const persona = await personaDePrueba("Juana", "Poot");
    await abrirResidencia(persona.id, domicilioId);

    const desdeMotul = await residentesDeDomicilio(domicilioId, contextoDe());
    const desdeTicul = await residentesDeDomicilio(
      domicilioId,
      contextoDeTicul(),
    );

    expect(desdeMotul).toHaveLength(1);
    expect(desdeTicul).toEqual([]);
  });
});
