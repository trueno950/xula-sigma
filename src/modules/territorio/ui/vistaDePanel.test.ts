import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { pasosDeMigaja, pestanasDePanel } from "./vistaDePanel";

const idA = comoLugarId("11111111-1111-4111-8111-111111111111");
const idB = comoLugarId("22222222-2222-4222-8222-222222222222");

describe("pasosDeMigaja", () => {
  it("siempre abre con Territorio hacia el listado", () => {
    const pasos = pasosDeMigaja(idA, [{ id: idA, nombre: "Motul" }]);

    expect(pasos[0]).toEqual({ etiqueta: "Territorio", href: "/territorio" });
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

  it("nombra el alcance de cada cuenta para el lector de pantalla", () => {
    const pestanas = pestanasDePanel({ ...base, abreLaEdicion: false });
    const porClave = new Map(
      pestanas.map((pestana) => [pestana.clave, pestana.etiquetaAccesible]),
    );

    expect(porClave.get("lugares")).toBe("Lugares: 3");
    // Las dos etiquetas cambiaron con A2: la de calles decia "catalogo del
    // asentamiento" cuando el numero era el catalogo entero y todos los
    // nodos mostraban el mismo; la de domicilios decia "de este lugar"
    // cuando solo contaba lo colgado directo. Un `aria-label` que sobrevive
    // al cambio del numero que describe le miente a quien no ve la pantalla.
    expect(porClave.get("calles")).toBe("Calles: 1");
    expect(porClave.get("domicilios")).toBe(
      "Domicilios (de este lugar y lo que contiene): 0",
    );
  });
});

describe("los enlaces del panel no arrastran la confirmacion", () => {
  it("ni la migaja ni las pestanas llevan `ok`", () => {
    const pasos = pasosDeMigaja(idA, [
      { id: idA, nombre: "Motul" },
      { id: idB, nombre: "Centro" },
    ]);
    const pestanas = pestanasDePanel({
      raizId: idA,
      nodoId: idB,
      vista: "lugares",
      cuentas: { lugares: 1, calles: 1, domicilios: 1 },
      abreLaEdicion: true,
    });
    const hrefs = [...pasos, ...pestanas].map((paso) => paso.href ?? "");

    expect(hrefs.join(" ")).not.toContain("ok=");
  });
});
