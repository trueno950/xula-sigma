import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

const NUEVO = "55555555-5555-4555-8555-555555555555";

/** `?nuevo=`: el lugar que el alta acaba de crear, para enlazarlo. */
describe("leerParametros: el lugar recien creado", () => {
  it("lee un uuid", () => {
    expect(leerParametros({ ok: "lugar-creado", nuevo: NUEVO }).nuevo).toBe(
      NUEVO,
    );
  });

  it("descarta lo que no es un uuid, sin tocar la confirmacion", () => {
    const parametros = leerParametros({
      ok: "lugar-creado",
      nuevo: "Colonia Centro",
    });

    expect(parametros.nuevo).toBeUndefined();
    expect(parametros.ok).toBe("lugar-creado");
  });
});
