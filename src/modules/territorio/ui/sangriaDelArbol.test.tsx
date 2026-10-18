import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { comoLugarId, type LugarId, type TipoDeLugar } from "../domain";
import type { NodoDeArbol } from "./arbolDeLugares";
import { NodoDelArbol } from "./NodoDelArbol";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");

type DatosDeNodo = {
  nombre: string;
  nivel: number;
  hijos?: readonly NodoDeArbol[];
  tipo?: TipoDeLugar;
};

const nodo = ({
  nombre,
  nivel,
  hijos = [],
  tipo = "colonia",
}: DatosDeNodo): NodoDeArbol => ({
  lugar: {
    id: comoLugarId(crypto.randomUUID()),
    nombre,
    tipo,
    padreId: null,
  },
  raizId,
  nivel,
  hijos,
  masAdentro: 0,
  coincide: false,
});

const cuentas = new Map<LugarId, ConteoDeLugar>();

const pintar = (n: NodoDeArbol) =>
  renderToStaticMarkup(
    <ul>
      <NodoDelArbol nodo={n} cuentas={cuentas} abrirTodo={false} />
    </ul>,
  );

/**
 * El invariante barato: una sola clase de sangria para todas las filas, porque
 * cada una vive dentro de la lista de su padre, que ya viene desplazada. El
 * porque del paso fijo esta en `FilaDeLugar.tsx`, y la comprobacion de que el
 * paso medido sea el mismo en cada nivel vive en
 * `e2e/sangriaDelArbol.spec.ts`: sobre el marcado no se puede distinguir una
 * sangria acumulada de una plana.
 */
describe("sangria del arbol de lugares", () => {
  const rama = nodo({
    nombre: "Buenavista",
    nivel: 0,
    hijos: [
      nodo({
        nombre: "Colonia Centro",
        nivel: 1,
        hijos: [nodo({ nombre: "Manzana 001", nivel: 2, tipo: "manzana" })],
      }),
    ],
  });

  it("el mismo paso en todas las filas", () => {
    const pasos = [...pintar(rama).matchAll(/pl-(?:\[[^\]]*\]|\d+)/g)].map(
      (m) => m[0],
    );

    expect(new Set(pasos)).toEqual(new Set(["pl-4"]));
  });

  it("un paso por fila, aunque la rama tenga tres niveles", () => {
    expect([...pintar(rama).matchAll(/pl-4/g)]).toHaveLength(3);
  });
});
