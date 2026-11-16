import { describe, expect, it } from "vitest";
import { CLAVES_DE_ICONO, type ClaveDeIcono, iconoDe } from "../domain";
import {
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "../domain/vocabularios";

const TIPOS_DE_REPORTE = TIPOS_DE_REPORTE_PARA_FILTRO;
const TIPOS_DE_INTERVENCION = TIPOS_DE_INTERVENCION_PARA_FILTRO;

describe("iconoDe", () => {
  it.each(TIPOS_DE_REPORTE)(
    "cada tipo de reporte tiene su propio icono: %s",
    (tipo) => {
      expect(iconoDe(tipo)).toBe(tipo);
    },
  );

  it.each(TIPOS_DE_INTERVENCION)(
    "cada tipo de intervencion tiene su propio icono: %s",
    (tipo) => {
      expect(iconoDe(tipo)).toBe(tipo);
    },
  );

  it("un tipo que el mapa no conoce cae al icono generico, no lo esconde", () => {
    expect(iconoDe("INVENTADO")).toBe("OTRO");
    expect(iconoDe("")).toBe("OTRO");
  });

  it("todo icono devuelto pertenece al catalogo cerrado", () => {
    const devueltos = [...TIPOS_DE_REPORTE, ...TIPOS_DE_INTERVENCION, "X"].map(
      (tipo) => iconoDe(tipo),
    );

    for (const clave of devueltos) {
      expect(CLAVES_DE_ICONO).toContain(clave as ClaveDeIcono);
    }
  });
});
