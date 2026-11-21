import { describe, expect, it } from "vitest";
import {
  codificarAvisoPendiente,
  decodificarAvisoPendiente,
} from "./avisoPendiente";

/**
 * La forma de lo que viaja en la cookie del aviso (S13/S14). No lleva ni el
 * nombre ni la fecha: la pantalla los resuelve del listado bajo RLS, asi que
 * la cookie solo dice quien y con que token.
 *
 * El esquema tiene dientes porque la cookie la puede reescribir el navegador:
 * lo que no tenga esta forma se ignora entero.
 */

const AVISO = {
  token: "11111111-1111-4111-8111-111111111111",
  usuarioId: "22222222-2222-4222-8222-222222222222",
};

describe("aviso pendiente", () => {
  it("va y vuelve entero", () => {
    expect(decodificarAvisoPendiente(codificarAvisoPendiente(AVISO))).toEqual(
      AVISO,
    );
  });

  it("sin valor no hay aviso", () => {
    expect(decodificarAvisoPendiente(undefined)).toBeNull();
    expect(decodificarAvisoPendiente("")).toBeNull();
  });

  it("un valor que no es JSON se ignora en vez de romper la pantalla", () => {
    expect(decodificarAvisoPendiente("{")).toBeNull();
  });

  it("un token o un usuario que no son uuid se descartan", () => {
    expect(
      decodificarAvisoPendiente(
        JSON.stringify({ ...AVISO, token: "no-es-un-token" }),
      ),
    ).toBeNull();
    expect(
      decodificarAvisoPendiente(
        JSON.stringify({ ...AVISO, usuarioId: "no-es-un-usuario" }),
      ),
    ).toBeNull();
  });
});
