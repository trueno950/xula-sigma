import { describe, expect, it, vi } from "vitest";
import {
  ClaveDebilError,
  hashDeClave,
  LARGO_MINIMO,
  verificarClave,
} from "./contrasenia";

describe("hashDeClave", () => {
  it("produce un hash argon2id, no la clave en claro", async () => {
    const digest = await hashDeClave("clave-larga-y-buena");

    // El prefijo identifica la variante. `$argon2i$` o `$argon2d$` serian
    // el algoritmo equivocado seleccionado en silencio: el parametro es un
    // numero (Argon2id = 2) y el numero de al lado tambien es valido.
    expect(digest).toMatch(/^\$argon2id\$/);
    expect(digest).not.toContain("clave-larga-y-buena");
  });

  it("dos hashes de la misma clave son distintos", async () => {
    const [uno, otro] = await Promise.all([
      hashDeClave("clave-larga-y-buena"),
      hashDeClave("clave-larga-y-buena"),
    ]);

    // Sal por hash. Si coincidieran, dos personas con la misma clave
    // tendrian el mismo digest y la tabla se volveria un diccionario.
    expect(uno).not.toBe(otro);
  });

  it("rechaza una clave de menos de 12 caracteres", async () => {
    await expect(hashDeClave("corta123")).rejects.toBeInstanceOf(
      ClaveDebilError,
    );
  });

  it("acepta exactamente el largo minimo", async () => {
    // El borde. Un `<` donde va un `<=` deja pasar o rechaza justo aca.
    const justa = "a".repeat(LARGO_MINIMO);

    await expect(hashDeClave(justa)).resolves.toMatch(/^\$argon2id\$/);
  });

  it("no cuenta los espacios de los extremos como largo", async () => {
    // Diez caracteres mas dos espacios: justo el minimo si no se recorta,
    // y mas debil de lo que ese numero sugiere.
    await expect(hashDeClave(" clavecita1 ")).rejects.toBeInstanceOf(
      ClaveDebilError,
    );
  });
});

describe("verificarClave", () => {
  it("acepta la clave correcta", async () => {
    const digest = await hashDeClave("clave-larga-y-buena");

    await expect(verificarClave(digest, "clave-larga-y-buena")).resolves.toBe(
      true,
    );
  });

  it("rechaza una clave equivocada", async () => {
    const digest = await hashDeClave("clave-larga-y-buena");

    await expect(verificarClave(digest, "clave-larga-y-mala")).resolves.toBe(
      false,
    );
  });

  it("una clave equivocada no pasa por el catch", async () => {
    /**
     * Es lo que hace correcto registrar cada `catch`: el camino normal de
     * rechazo no lanza. Si `verify` lanzara ante clave incorrecta, el log
     * se llenaria de intentos fallidos legitimos.
     */
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const digest = await hashDeClave("clave-larga-y-buena");

    await verificarClave(digest, "clave-larga-y-mala");

    expect(registro).not.toHaveBeenCalled();
    registro.mockRestore();
  });

  it("registra el motivo cuando el digest es ilegible", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    await verificarClave("no-es-un-hash", "clave-larga-y-buena");

    expect(registro).toHaveBeenCalledTimes(1);
    // Ni la clave ni el digest salen al log.
    const escrito = JSON.stringify(registro.mock.calls.at(-1));
    expect(escrito).not.toContain("clave-larga-y-buena");
    expect(escrito).not.toContain("no-es-un-hash");
    registro.mockRestore();
  });

  it("devuelve false ante un digest corrupto, no lanza", async () => {
    /**
     * Una fila con el hash danado no puede tumbar el acceso con una
     * excepcion cruda: el borde la convertiria en 500 y el motivo diria
     * que el problema esta en la base. Es un rechazo de credencial.
     */
    await expect(
      verificarClave("no-es-un-hash", "clave-larga-y-buena"),
    ).resolves.toBe(false);
  });
});
