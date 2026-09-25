import { describe, expect, it } from "vitest";
import { describirCatalogoEtiquetado } from "@/shared/lib/catalogoEtiquetadoDePrueba";
import {
  ETIQUETA_DE_FILTRO,
  etiquetaDeFiltro,
} from "../domain/etiquetasDeFiltro";
import {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain/vocabularios";

const VOCABULARIO_COMPLETO = [
  ...new Set([
    ...TIPOS_DE_REPORTE_PARA_FILTRO,
    ...TIPOS_DE_INTERVENCION_PARA_FILTRO,
    ...ESTADOS_DE_REPORTE_PARA_FILTRO,
    ...ESTADOS_DE_INTERVENCION_PARA_FILTRO,
    ...AREAS_PARA_FILTRO,
  ]),
];

describirCatalogoEtiquetado(
  "filtros del mapa",
  VOCABULARIO_COMPLETO,
  ETIQUETA_DE_FILTRO,
);

describe("etiquetaDeFiltro", () => {
  it("un valor del vocabulario se lee con su etiqueta", () => {
    expect(etiquetaDeFiltro("OBRAS_PUBLICAS")).toBe("Obras públicas");
    expect(etiquetaDeFiltro("EN_EJECUCION")).toBe("En ejecución");
  });

  it("un valor que el mapa no conoce se muestra tal cual y no se pierde", () => {
    expect(etiquetaDeFiltro("NUEVO_TIPO")).toBe("NUEVO_TIPO");
  });
});
