import { describe, expect, it } from "vitest";
import {
  CREDENCIALES_INVALIDAS,
  DEMASIADOS_INTENTOS,
  mensajeDeRechazo,
  TEMPORAL_CADUCADA,
} from "./mensajeDeRechazo";

/**
 * S1: entrar con una temporal caducada se rechaza con un mensaje que pide
 * restablecerla, y ese mensaje **solo** aparece cuando el rechazo trae su
 * codigo. Cualquier otro rechazo —clave equivocada, cuenta inexistente,
 * cuenta dada de baja— sigue diciendo lo mismo que antes, que es lo que
 * impide confirmar que una cuenta existe.
 */

describe("mensaje de rechazo del acceso", () => {
  it("la temporal caducada pide a quien administra que la restablezca", () => {
    expect(
      mensajeDeRechazo({
        status: 403,
        cuerpo: { code: "CLAVE_TEMPORAL_CADUCADA" },
      }),
    ).toBe(TEMPORAL_CADUCADA);
  });

  it("una clave equivocada no distingue nada", () => {
    expect(
      mensajeDeRechazo({
        status: 401,
        cuerpo: { code: "INVALID_EMAIL_OR_PASSWORD" },
      }),
    ).toBe(CREDENCIALES_INVALIDAS);
  });

  it("un 403 con otro codigo no se toma por la temporal caducada", () => {
    expect(
      mensajeDeRechazo({ status: 403, cuerpo: { code: "OTRO_MOTIVO" } }),
    ).toBe(CREDENCIALES_INVALIDAS);
  });

  it("un cuerpo ilegible cae en el mensaje generico", () => {
    expect(mensajeDeRechazo({ status: 401, cuerpo: null })).toBe(
      CREDENCIALES_INVALIDAS,
    );
  });

  it("el limite de ritmo conserva su propio mensaje", () => {
    expect(mensajeDeRechazo({ status: 429, cuerpo: null })).toBe(
      DEMASIADOS_INTENTOS,
    );
  });
});
