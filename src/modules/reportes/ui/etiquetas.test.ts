import { describe, expect, it } from "vitest";
import { describirCatalogoEtiquetado } from "@/shared/lib/catalogoEtiquetadoDePrueba";
import { AREAS_RESPONSABLES } from "../domain/areaResponsable";
import { ESTADOS_DE_REPORTE } from "../domain/estado";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_MOTIVO_DE_RECHAZO,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  SIN_AREA,
} from "../domain/etiquetas";
import { MOTIVOS_DE_RECHAZO } from "../domain/motivos";
import { TIPOS_DE_INCIDENCIA } from "../domain/tipoDeIncidencia";

describirCatalogoEtiquetado(
  "estado de reporte",
  ESTADOS_DE_REPORTE,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
);
describirCatalogoEtiquetado(
  "area responsable",
  AREAS_RESPONSABLES,
  ETIQUETA_DE_AREA,
);
describirCatalogoEtiquetado(
  "motivo de rechazo",
  MOTIVOS_DE_RECHAZO,
  ETIQUETA_DE_MOTIVO_DE_RECHAZO,
);
describirCatalogoEtiquetado(
  "tipo de incidencia",
  TIPOS_DE_INCIDENCIA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
);

describe("etiquetas de reportes", () => {
  it("escribe con acento y en minuscula despues de la primera palabra", () => {
    expect(ETIQUETA_DE_ESTADO_DE_REPORTE.EN_ATENCION).toBe("En atención");
    expect(ETIQUETA_DE_AREA.OBRAS_PUBLICAS).toBe("Obras públicas");
    expect(ETIQUETA_DE_MOTIVO_DE_RECHAZO.INFORMACION_INSUFICIENTE).toBe(
      "Información insuficiente",
    );
  });

  it("el area sin asignar se lee igual para todos", () => {
    expect(SIN_AREA).toBe("Sin asignar");
  });
});
