import { describe, expect, it } from "vitest";
import { esquemaDeReporte } from "./validacionDeReporte";

/**
 * El Zod del alta (design.md seccion 5, tasks.md 4.3): `descripcion`
 * 10..1000 obligatoria, `referencia` 0..200 opcional, `tipo` union cerrada,
 * `lugarId` UUID, `calleId` UUID opcional, `personaId` UUID opcional.
 *
 * Vive en `application` y no en `domain` por `dominio-no-importa-nada`: Zod
 * es dependencia de produccion (design.md seccion 2).
 */
describe("esquemaDeReporte", () => {
  const valido = {
    descripcion: "Bache grande frente al parque principal",
    tipo: "BACHE",
    lugarId: "11111111-1111-4111-8111-111111111111",
  };

  it("acepta un alta valida con los opcionales ausentes", () => {
    const resultado = esquemaDeReporte.safeParse(valido);

    expect(resultado.success).toBe(true);
  });

  it("rechaza una descripcion menor a 10 caracteres", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      descripcion: "bache",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un tipo fuera de la union cerrada", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      tipo: "INCENDIO",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un lugarId que no es UUID", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      lugarId: "no-es-un-uuid",
    });

    expect(resultado.success).toBe(false);
  });

  it("acepta un domicilio con lugar y calle derivados por el servidor", () => {
    const domicilioId = "22222222-2222-4222-8222-222222222222";
    const resultado = esquemaDeReporte.safeParse({
      descripcion: valido.descripcion,
      tipo: valido.tipo,
      domicilioId,
    });

    expect(resultado).toMatchObject({
      success: true,
      data: { domicilioId },
    });
  });

  it("rechaza el alta sin domicilio ni lugar", () => {
    const resultado = esquemaDeReporte.safeParse({
      descripcion: valido.descripcion,
      tipo: valido.tipo,
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un domicilioId que no es UUID", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      domicilioId: "no-es-un-uuid",
    });

    expect(resultado.success).toBe(false);
  });

  it("acepta calleId, personaId y referencia corta como opcionales", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      calleId: "11111111-1111-4111-8111-111111111111",
      personaId: "11111111-1111-4111-8111-111111111111",
      referencia: "frente a la tienda de la esquina",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza una referencia de mas de 200 caracteres", () => {
    const resultado = esquemaDeReporte.safeParse({
      ...valido,
      referencia: "x".repeat(201),
    });

    expect(resultado.success).toBe(false);
  });
});
