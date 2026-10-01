import { describe, expect, it } from "vitest";
import { describirCatalogoEtiquetado } from "@/shared/lib/catalogoEtiquetadoDePrueba";
import {
  ETIQUETA_DE_TIPO_DE_LUGAR,
  tipoDeLugarEnFrase,
} from "../domain/etiquetas";
import { TIPOS_DE_LUGAR } from "../domain/tipoDeLugar";

describirCatalogoEtiquetado(
  "tipo de lugar",
  TIPOS_DE_LUGAR,
  ETIQUETA_DE_TIPO_DE_LUGAR,
);

describe("etiquetas de tipo de lugar", () => {
  it("comisaria se escribe con su acento", () => {
    expect(ETIQUETA_DE_TIPO_DE_LUGAR.comisaria).toBe("Comisaría");
  });

  it("dentro de una frase el tipo va en minuscula", () => {
    expect(tipoDeLugarEnFrase("comisaria")).toBe("comisaría");
    expect(tipoDeLugarEnFrase("colonia")).toBe("colonia");
  });
});
