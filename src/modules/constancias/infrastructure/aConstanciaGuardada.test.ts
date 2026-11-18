import { describe, expect, it } from "vitest";
import { aConstanciaGuardada } from "./aConstanciaGuardada";
import type { constancias } from "./esquema";

/**
 * Modelo de lectura de una fila (`constancias-ux`, S1/S7/S8): el nombre del
 * titular sale del snapshot congelado al emitir -el registro legal, no una
 * lectura viva del padron- y el estado se deriva de `canceladaEn`, que no es
 * una columna.
 */
type Fila = typeof constancias.$inferSelect;

const fila = (parcial: Partial<Fila> = {}): Fila => ({
  id: "11111111-1111-4111-8111-111111111111" as Fila["id"],
  ayuntamientoId:
    "22222222-2222-4222-8222-222222222222" as Fila["ayuntamientoId"],
  tipo: "VECINDAD",
  folio: "VEC-2026-000001",
  anio: 2026,
  consecutivo: 1,
  codigoVerificacion: "0123456789abcdef",
  personaId: "33333333-3333-4333-8333-333333333333",
  datos: {
    titular: { nombreCompleto: "José Peña Poot" },
    direccion: {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
  plantillaVersion: "vecindad-v1",
  emitidaPorUsuarioId: "44444444-4444-4444-8444-444444444444",
  emitidaEn: new Date("2026-03-01T18:00:00Z"),
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
  ...parcial,
});

describe("aConstanciaGuardada", () => {
  it("el nombre del titular viene del snapshot congelado en la emision", () => {
    expect(aConstanciaGuardada(fila()).nombreDelTitular).toBe("José Peña Poot");
  });

  it("una constancia sin cancelar se lee VIGENTE", () => {
    expect(aConstanciaGuardada(fila()).estado).toBe("VIGENTE");
  });

  it("una cancelada se lee CANCELADA y conserva cuando y por que", () => {
    const constancia = aConstanciaGuardada(
      fila({
        canceladaEn: new Date("2026-02-01T18:00:00Z"),
        canceladaPorUsuarioId: "44444444-4444-4444-8444-444444444444",
        motivoCancelacion: "ERROR_DE_CAPTURA",
      }),
    );

    expect(constancia.estado).toBe("CANCELADA");
    expect(constancia.canceladaEn).toEqual(new Date("2026-02-01T18:00:00Z"));
    expect(constancia.motivoCancelacion).toBe("ERROR_DE_CAPTURA");
  });

  it("expone el personaId del titular para enlazar a su ficha del padron", () => {
    expect(aConstanciaGuardada(fila()).personaId).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
  });
});
