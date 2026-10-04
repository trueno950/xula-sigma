import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { filtrosVisiblesDeDomicilios } from "./filtrosVisiblesDeDomicilios";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nombre = (id: string) => (id === raizId ? "Tepakan" : undefined);

describe("filtrosVisiblesDeDomicilios", () => {
  it("sin filtros no hay nada que nombrar", () => {
    expect(filtrosVisiblesDeDomicilios({}, nombre)).toEqual([]);
  });

  it("nombra los tres filtros en el orden del formulario", () => {
    expect(
      filtrosVisiblesDeDomicilios(
        { calle: "Calle 21", numero: "5", raizId },
        nombre,
      ).map((f) => f.etiqueta),
    ).toEqual(["Calle: Calle 21", "Número: 5", "Asentamiento: Tepakan"]);
  });

  it("un asentamiento fuera del catalogo se nombra igual, sin mostrar el id", () => {
    const [filtro] = filtrosVisiblesDeDomicilios({ raizId }, () => undefined);

    expect(filtro?.etiqueta).toBe("Asentamiento: el elegido");
  });
});
