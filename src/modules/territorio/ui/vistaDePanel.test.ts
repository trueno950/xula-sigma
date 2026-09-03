import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { pasosDeMigaja, pestanasDePanel } from "./vistaDePanel";

const idA = comoLugarId("11111111-1111-4111-8111-111111111111");
const idB = comoLugarId("22222222-2222-4222-8222-222222222222");

describe("pasosDeMigaja", () => {
  it("siempre abre con Lugares hacia el listado", () => {
    const pasos = pasosDeMigaja(idA, [{ id: idA, nombre: "Motul" }]);

    expect(pasos[0]).toEqual({ etiqueta: "Lugares", href: "/territorio" });
  });

  it("el ultimo paso no lleva href: es el actual, no un destino", () => {
    const pasos = pasosDeMigaja(idA, [
      { id: idA, nombre: "Motul" },
      { id: idB, nombre: "Centro" },
    ]);

    expect(pasos.at(-1)).toEqual({ etiqueta: "Centro" });
  });

  it("los pasos previos al ultimo llevan href a su propio nodo", () => {
    const pasos = pasosDeMigaja(idA, [
      { id: idA, nombre: "Motul" },
      { id: idB, nombre: "Centro" },
    ]);

    expect(pasos[1]).toEqual({
      etiqueta: "Motul",
      href: `/territorio?raiz=${idA}&nodo=${idA}`,
    });
  });
});

describe("pestanasDePanel", () => {
  const base = {
    raizId: idA,
    nodoId: idB,
    vista: "lugares" as const,
    cuentas: { lugares: 3, calles: 1, domicilios: 0 },
  };

  it("sin abreLaEdicion no ofrece la pestana Editar", () => {
    const pestanas = pestanasDePanel({ ...base, abreLaEdicion: false });

    expect(pestanas.map((p) => p.clave)).toEqual([
      "lugares",
      "calles",
      "domicilios",
    ]);
  });

  it("con abreLaEdicion agrega Editar sin cuenta", () => {
    const pestanas = pestanasDePanel({ ...base, abreLaEdicion: true });
    const editar = pestanas.find((p) => p.clave === "editar");

    expect(editar).toBeDefined();
    expect(editar).not.toHaveProperty("cuenta");
  });

  it("marca activa solo la pestana de la vista actual", () => {
    const pestanas = pestanasDePanel({
      ...base,
      vista: "calles",
      abreLaEdicion: false,
    });

    expect(pestanas.filter((p) => p.activa).map((p) => p.clave)).toEqual([
      "calles",
    ]);
  });

  it("cada href lleva la raiz, el nodo y la vista de esa pestana", () => {
    const pestanas = pestanasDePanel({ ...base, abreLaEdicion: false });
    const domicilios = pestanas.find((p) => p.clave === "domicilios");

    expect(domicilios?.href).toBe(
      `/territorio?raiz=${idA}&nodo=${idB}&vista=domicilios`,
    );
  });
});
