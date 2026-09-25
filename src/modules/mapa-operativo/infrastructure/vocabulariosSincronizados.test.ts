import { describe, expect, it } from "vitest";
import {
  ESTADOS_DE_INTERVENCION,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  TIPOS_DE_INCIDENCIA,
} from "@/modules/reportes";
import { ETIQUETA_DE_FILTRO } from "../domain/etiquetasDeFiltro";
import {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain/vocabularios";

/**
 * El mapa guarda una copia local de los vocabularios de `reportes` e
 * `intervenciones` (`domain/vocabularios.ts`) y de su etiqueta. Este es el
 * unico lugar donde se comparan con sus duenos: si alguno agrega, quita o
 * renombra un miembro, este test falla en vez de dejar la copia vieja.
 */
const CASOS = [
  ["tipos de reporte", TIPOS_DE_REPORTE_PARA_FILTRO, TIPOS_DE_INCIDENCIA],
  [
    "tipos de intervencion",
    TIPOS_DE_INTERVENCION_PARA_FILTRO,
    TIPOS_DE_INTERVENCION,
  ],
  ["estados de reporte", ESTADOS_DE_REPORTE_PARA_FILTRO, ESTADOS_DE_REPORTE],
  [
    "estados de intervencion",
    ESTADOS_DE_INTERVENCION_PARA_FILTRO,
    ESTADOS_DE_INTERVENCION,
  ],
  ["areas", AREAS_PARA_FILTRO, AREAS_RESPONSABLES],
] as const;

const ETIQUETAS_DUENAS: Readonly<Record<string, string>> = {
  ...ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  ...ETIQUETA_DE_TIPO_DE_INTERVENCION,
  ...ETIQUETA_DE_ESTADO_DE_REPORTE,
  ...ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ...ETIQUETA_DE_AREA,
};

describe("vocabularios del mapa frente a sus duenos", () => {
  it.each(CASOS)(
    "%s: mismos miembros, en el mismo orden",
    (_n, copia, dueno) => {
      expect([...copia]).toEqual([...dueno]);
    },
  );

  it("cada miembro se lee igual que en el modulo que lo posee", () => {
    for (const [codigo, etiqueta] of Object.entries(ETIQUETA_DE_FILTRO)) {
      expect(ETIQUETAS_DUENAS[codigo], codigo).toBe(etiqueta);
    }
  });
});
