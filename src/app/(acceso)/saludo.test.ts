import { describe, expect, it } from "vitest";
import { saludoDeLaHora } from "./saludo";

describe("saludoDeLaHora", () => {
  it.each([
    [5, "Buenos días"],
    [11, "Buenos días"],
    [12, "Buenas tardes"],
    [18, "Buenas tardes"],
    [19, "Buenas noches"],
    [23, "Buenas noches"],
    [0, "Buenas noches"],
    [4, "Buenas noches"],
  ])("a las %i h dice %s", (hora, esperado) => {
    expect(saludoDeLaHora(hora)).toBe(esperado);
  });
});
