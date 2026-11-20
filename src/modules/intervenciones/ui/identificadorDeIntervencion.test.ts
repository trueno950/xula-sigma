import { describe, expect, it } from "vitest";
import { comoIntervencionId } from "../domain";
import { identificadorDeIntervencion } from "./identificadorDeIntervencion";

describe("identificadorDeIntervencion", () => {
  it("toma el prefijo del id en mayusculas, con el prefijo INT-", () => {
    expect(
      identificadorDeIntervencion(
        comoIntervencionId("3f1c8a90-1111-4111-8111-111111111111"),
      ),
    ).toBe("INT-3F1C");
  });

  it("es estable: la misma intervencion dice siempre lo mismo", () => {
    const id = comoIntervencionId("8c2190ab-2222-4222-8222-222222222222");

    expect(identificadorDeIntervencion(id)).toBe(
      identificadorDeIntervencion(id),
    );
  });

  it("distingue dos intervenciones distintas y no muestra el uuid entero", () => {
    const uno = identificadorDeIntervencion(
      comoIntervencionId("8c2190ab-2222-4222-8222-222222222222"),
    );
    const otro = identificadorDeIntervencion(
      comoIntervencionId("7a4e90ab-2222-4222-8222-222222222222"),
    );

    expect(uno).not.toBe(otro);
    expect(uno).not.toContain("8c2190ab-2222");
  });
});
