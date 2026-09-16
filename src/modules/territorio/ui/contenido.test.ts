import { describe, expect, it } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import { cuentasDeLugar } from "./contenido";

const coloniaId = comoLugarId("11111111-1111-4111-8111-111111111111");

describe("cuentasDeLugar", () => {
  it("cuenta las calles del asentamiento en un nivel inferior", () => {
    const cuentas = cuentasDeLugar({
      nodos: [],
      domicilios: [],
      calles: [{ id: comoCalleId("22222222-2222-4222-8222-222222222222") }],
      nodo: { id: coloniaId, tipo: "colonia", nombre: "Centro" },
    });

    expect(cuentas.calles).toBe(1);
  });
});
