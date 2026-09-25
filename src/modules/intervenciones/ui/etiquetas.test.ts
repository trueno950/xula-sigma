import { describe, expect, it } from "vitest";
import { describirCatalogoEtiquetado } from "@/shared/lib/catalogoEtiquetadoDePrueba";
import { ESTADOS_DE_INTERVENCION } from "../domain/estado";
import {
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
} from "../domain/etiquetas";
import { TIPOS_DE_INTERVENCION } from "../domain/tipoDeIntervencion";

describirCatalogoEtiquetado(
  "estado de intervencion",
  ESTADOS_DE_INTERVENCION,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
);
describirCatalogoEtiquetado(
  "tipo de intervencion",
  TIPOS_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
);

describe("etiquetas de intervenciones", () => {
  it("se escriben con su acento", () => {
    expect(ETIQUETA_DE_ESTADO_DE_INTERVENCION.EN_EJECUCION).toBe(
      "En ejecución",
    );
    expect(ETIQUETA_DE_TIPO_DE_INTERVENCION.REPAVIMENTACION).toBe(
      "Repavimentación",
    );
  });
});
