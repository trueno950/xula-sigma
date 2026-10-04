import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { armarArbol, type LugarDelArbol } from "./arbolDeLugares";

const id = (n: number) =>
  comoLugarId(`${n}${n}${n}${n}${n}${n}${n}${n}-1111-4111-8111-111111111111`);

const lugar = ({
  n,
  nombre,
  tipo,
  padre,
}: {
  n: number;
  nombre: string;
  tipo: LugarDelArbol["tipo"];
  padre?: number;
}): LugarDelArbol => ({
  id: id(n),
  nombre,
  tipo,
  padreId: padre ? id(padre) : null,
});

const cabecera = lugar({ n: 1, nombre: "Buenavista", tipo: "cabecera" });
const centro = lugar({
  n: 2,
  nombre: "Colonia Centro",
  tipo: "colonia",
  padre: 1,
});
const sectorUno = lugar({
  n: 3,
  nombre: "Sector Único",
  tipo: "sector",
  padre: 2,
});
const manzana = lugar({ n: 4, nombre: "Manzana 7", tipo: "manzana", padre: 3 });
const otraColonia = lugar({
  n: 5,
  nombre: "Colonia Norte",
  tipo: "colonia",
  padre: 1,
});
const comisaria = lugar({ n: 6, nombre: "Dzununcan", tipo: "comisaria" });
const todos = [cabecera, centro, sectorUno, manzana, otraColonia, comisaria];
const raices = [cabecera, comisaria];

describe("armarArbol sin busqueda", () => {
  it("muestra tres niveles y resume lo que queda mas adentro", () => {
    const arbol = armarArbol({ raices, lugares: todos, busqueda: undefined });

    const [raiz] = arbol;
    const hijo = raiz?.hijos[0];
    const nieto = hijo?.hijos[0];

    expect(arbol.map((n) => n.lugar.nombre)).toEqual([
      "Buenavista",
      "Dzununcan",
    ]);
    expect(raiz?.hijos.map((n) => n.lugar.nombre)).toEqual([
      "Colonia Centro",
      "Colonia Norte",
    ]);
    expect(nieto?.lugar.nombre).toBe("Sector Único");
    expect(nieto?.hijos).toEqual([]);
    expect(nieto?.masAdentro).toBe(1);
    expect(hijo?.masAdentro).toBe(0);
  });

  it("cada nodo conoce la raiz para armar su enlace", () => {
    const [raiz] = armarArbol({ raices, lugares: todos, busqueda: undefined });

    expect(raiz?.hijos[0]?.raizId).toBe(cabecera.id);
  });
});

describe("armarArbol con busqueda", () => {
  it("conserva los ancestros del que coincide y sigue hasta el fondo", () => {
    const arbol = armarArbol({ raices, lugares: todos, busqueda: "manzana" });

    expect(arbol.map((n) => n.lugar.nombre)).toEqual(["Buenavista"]);
    const profundo = arbol[0]?.hijos[0]?.hijos[0]?.hijos[0];
    expect(profundo?.lugar.nombre).toBe("Manzana 7");
    expect(profundo?.coincide).toBe(true);
    expect(arbol[0]?.coincide).toBe(false);
  });

  it("ignora acentos y mayusculas", () => {
    const arbol = armarArbol({ raices, lugares: todos, busqueda: "UNICO" });

    expect(arbol[0]?.hijos[0]?.hijos[0]?.coincide).toBe(true);
  });

  it("descarta las ramas sin coincidencias", () => {
    const arbol = armarArbol({ raices, lugares: todos, busqueda: "norte" });

    expect(arbol[0]?.hijos.map((n) => n.lugar.nombre)).toEqual([
      "Colonia Norte",
    ]);
  });

  it("sin coincidencias devuelve un arbol vacio", () => {
    expect(armarArbol({ raices, lugares: todos, busqueda: "zzzz" })).toEqual(
      [],
    );
  });
});
