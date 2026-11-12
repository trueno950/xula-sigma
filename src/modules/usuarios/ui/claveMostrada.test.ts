import { describe, expect, it } from "vitest";
import {
  type ClaveMostrada,
  codificarClaveMostrada,
  decodificarClaveMostrada,
} from "./claveMostrada";

/**
 * La clave temporal no viaja en la URL (S4). Viaja en esta cookie, que es
 * lo que la pagina lee cuando el redirect trae su token; el formulario que
 * la escribe es la accion. Lo que se prueba aca es que una cookie que el
 * navegador pudo reescribir se ignore entera en vez de mostrarse a medias.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const USUARIO = "22222222-2222-4222-8222-222222222222";

const valida: ClaveMostrada = {
  token: TOKEN,
  motivo: "alta",
  usuarioId: USUARIO,
  clave: "clave-temporal-larga",
};

const json = (valor: unknown) => JSON.stringify(valor);

describe("decodificarClaveMostrada", () => {
  it("devuelve lo mismo que se guardo", () => {
    expect(decodificarClaveMostrada(codificarClaveMostrada(valida))).toEqual(
      valida,
    );
  });

  it("sin cookie no hay nada que mostrar", () => {
    expect(decodificarClaveMostrada(undefined)).toBeNull();
    expect(decodificarClaveMostrada("")).toBeNull();
  });

  it("un JSON roto no revienta: no hay nada que mostrar", () => {
    expect(decodificarClaveMostrada("{no es json")).toBeNull();
  });

  it.each([
    ["sin token", { ...valida, token: undefined }],
    ["con token que no es uuid", { ...valida, token: "abc" }],
    ["con motivo desconocido", { ...valida, motivo: "otra-cosa" }],
    ["sin la clave", { ...valida, clave: undefined }],
    ["con un usuario que no es uuid", { ...valida, usuarioId: "motul" }],
  ])("ignora una cookie %s", (_caso, contenido) => {
    expect(decodificarClaveMostrada(json(contenido))).toBeNull();
  });

  it("ignora una clave mas corta que el minimo del sistema", () => {
    expect(decodificarClaveMostrada(json({ ...valida, clave: "corta" }))).toBe(
      null,
    );
  });
});
