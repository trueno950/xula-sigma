import { describe, expect, it } from "vitest";
import type { UsuarioDelPanel } from "../domain";
import { agruparListado } from "./agrupacionDelListado";

/**
 * S4 de `usuarios-ux`: el orden es explicito. Las activas van por rol
 * —administrador, operador, consulta— y dentro de cada rol por nombre; las de
 * baja van al final, aparte, de la mas reciente a la mas antigua (S5).
 *
 * Se prueba sobre la funcion y no sobre el HTML porque el orden es la regla:
 * el marcado solo la dibuja.
 */

const persona = (sobre: Partial<UsuarioDelPanel> = {}): UsuarioDelPanel => ({
  id: "operador-1",
  nombre: "Operadora de Mostrador",
  email: "operadora@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
  bajaEn: null,
  ...sobre,
});

const deBaja = (id: string, nombre: string, bajaEn: string) =>
  persona({
    id,
    nombre,
    dadoDeBaja: true,
    bajaEn: new Date(`${bajaEn}T18:00:00Z`),
  });

describe("agruparListado", () => {
  it("agrupa las activas por rol en el orden del municipio", () => {
    const { grupos } = agruparListado([
      persona({ id: "c-1", rol: "CONSULTA", nombre: "Ana" }),
      persona({ id: "a-1", rol: "ADMIN_MUNICIPAL", nombre: "Beto" }),
      persona({ id: "o-1", rol: "OPERADOR", nombre: "Carla" }),
    ]);

    expect(grupos.map((grupo) => grupo.rol)).toEqual([
      "ADMIN_MUNICIPAL",
      "OPERADOR",
      "CONSULTA",
    ]);
  });

  it("dentro de un rol conserva el orden por nombre que trae el listado", () => {
    const { grupos } = agruparListado([
      persona({ id: "o-1", nombre: "Ana" }),
      persona({ id: "o-2", nombre: "Carla" }),
      persona({ id: "o-3", nombre: "Beto" }),
    ]);

    expect(grupos[0]?.cuentas.map((cuenta) => cuenta.nombre)).toEqual([
      "Ana",
      "Carla",
      "Beto",
    ]);
  });

  it("un rol que no es del municipio tiene su propio grupo y no pierde la cuenta", () => {
    const { grupos } = agruparListado([
      persona({ id: "o-1" }),
      persona({ id: "s-1", rol: "SUPER_ADMIN", nombre: "Plataforma" }),
    ]);

    expect(grupos.map((grupo) => grupo.rol)).toEqual([
      "OPERADOR",
      "SUPER_ADMIN",
    ]);
    expect(grupos[1]?.cuentas).toHaveLength(1);
  });

  it("las bajas no viven en los grupos: van aparte, de la mas reciente a la mas antigua", () => {
    const { grupos, bajas } = agruparListado([
      deBaja("b-1", "Aurelia", "2026-10-03"),
      persona({ id: "o-1" }),
      deBaja("b-2", "Jose Armando", "2026-11-16"),
    ]);

    expect(grupos.flatMap((grupo) => grupo.cuentas)).toHaveLength(1);
    expect(bajas.map((cuenta) => cuenta.nombre)).toEqual([
      "Jose Armando",
      "Aurelia",
    ]);
  });

  it("cuenta todas, activas y de baja, incluso cuando son cero", () => {
    expect(agruparListado([])).toMatchObject({
      grupos: [],
      bajas: [],
      total: 0,
      activas: 0,
      deBaja: 0,
    });

    expect(
      agruparListado([
        persona({ id: "o-1" }),
        deBaja("b-1", "Aurelia", "2026-10-03"),
      ]),
    ).toMatchObject({ total: 2, activas: 1, deBaja: 1 });
  });

  it("un rol sin cuentas activas no produce grupo", () => {
    const { grupos } = agruparListado([
      persona({ id: "c-1", rol: "CONSULTA" }),
    ]);

    expect(grupos.map((grupo) => grupo.rol)).toEqual(["CONSULTA"]);
  });
});
