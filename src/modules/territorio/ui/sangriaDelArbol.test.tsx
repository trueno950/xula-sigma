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
 * La sangria de una fila es un **paso por nivel**, no una posicion acumulada:
 * cada fila vive dentro de la lista de su padre, que ya viene desplazada, asi
 * que el ancho que agrega un nivel tiene que ser el mismo en todos. Con la
 * tabla de posiciones que habia antes —`pl-4`, `pl-9`, `pl-14`, `pl-[4.5rem]`…—
 * el nivel 2 sumaba 1rem + 2.25rem + 3.5rem y el arbol se abria en abanico: es
 * el hallazgo `R3-cumulative-tree-indentation` de la revision nativa.
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

  it("el mismo paso en todos los niveles, sin posiciones acumuladas", () => {
    const html = pintar(rama);
    const pasos = [...html.matchAll(/pl-(?:\[[^\]]*\]|\d+)/g)].map((m) => m[0]);

    expect(new Set(pasos)).toEqual(new Set(["pl-4"]));
  });

  it("no repite la sangria de los ancestros en cada fila", () => {
    const html = pintar(rama);

    expect(html).not.toMatch(/pl-9|pl-14|pl-\[4\.5rem\]/);
  });

  it("una rama de tres niveles lleva un paso por fila", () => {
    const html = pintar(rama);
    const pasos = [...html.matchAll(/pl-4/g)].length;

    expect(pasos).toBe(3);
  });
});
