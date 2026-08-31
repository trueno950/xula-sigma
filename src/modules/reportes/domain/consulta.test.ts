import { describe, expect, it } from "vitest";
import type { FilaDeConsulta } from "./consulta";
import { proyectarConsulta, SIN_REGISTRO } from "./consulta";

/**
 * `toBe`, no `toEqual`: identidad, no forma (design.md seccion 14). Un
 * literal copiado en vez de la constante congelada pasaria `toEqual` y
 * falla `toBe` — es la reja que atrapa exactamente el defecto.
 */

const CONSULTADO: FilaDeConsulta = {
  tipo: "FUGA",
  estado: "RECHAZADO",
  registradoEn: "2026-08-28T10:00:00.000Z",
  actualizadoEn: "2026-08-28T11:00:00.000Z",
};

const ORIGINAL: FilaDeConsulta = {
  tipo: "FUGA",
  estado: "EN_ATENCION",
  registradoEn: "2026-08-01T09:00:00.000Z",
  actualizadoEn: "2026-08-27T15:00:00.000Z",
};

describe("proyectarConsulta", () => {
  it("consultado null da SIN_REGISTRO, la misma referencia", () => {
    expect(proyectarConsulta(null, null)).toBe(SIN_REGISTRO);
  });

  it("sin salto, tipo/estado/fechas son del propio consultado", () => {
    const resultado = proyectarConsulta(CONSULTADO, null);

    expect(resultado).toEqual({
      resultado: "REGISTRADO",
      tipo: CONSULTADO.tipo,
      estado: CONSULTADO.estado,
      registradoEn: CONSULTADO.registradoEn,
      actualizadoEn: CONSULTADO.actualizadoEn,
    });
  });

  it("con salto, tipo y registradoEn son del consultado; estado y actualizadoEn del original", () => {
    const resultado = proyectarConsulta(CONSULTADO, ORIGINAL);

    expect(resultado).toEqual({
      resultado: "REGISTRADO",
      tipo: CONSULTADO.tipo,
      estado: ORIGINAL.estado,
      registradoEn: CONSULTADO.registradoEn,
      actualizadoEn: ORIGINAL.actualizadoEn,
    });
  });
});
