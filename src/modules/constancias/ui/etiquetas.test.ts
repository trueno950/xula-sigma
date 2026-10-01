import { describe, expect, it } from "vitest";
import { describirCatalogoEtiquetado } from "@/shared/lib/catalogoEtiquetadoDePrueba";
import { ESTADOS_DE_CONSTANCIA } from "../domain/estadoDeConstancia";
import {
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
  ETIQUETA_DE_MOTIVO_DE_REIMPRESION,
} from "../domain/etiquetas";
import {
  MOTIVOS_DE_CANCELACION,
  MOTIVOS_DE_REIMPRESION,
} from "../domain/motivos";

describirCatalogoEtiquetado(
  "estado de constancia",
  ESTADOS_DE_CONSTANCIA,
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
);
describirCatalogoEtiquetado(
  "motivo de cancelacion",
  MOTIVOS_DE_CANCELACION,
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
);
describirCatalogoEtiquetado(
  "motivo de reimpresion",
  MOTIVOS_DE_REIMPRESION,
  ETIQUETA_DE_MOTIVO_DE_REIMPRESION,
);

describe("etiquetas de constancias", () => {
  it("los motivos se escriben con su acento", () => {
    expect(ETIQUETA_DE_MOTIVO_DE_CANCELACION.ERROR_DE_CAPTURA).toBe(
      "Error de captura",
    );
    expect(ETIQUETA_DE_MOTIVO_DE_REIMPRESION.EXTRAVIO).toBe("Extravío");
  });
});
