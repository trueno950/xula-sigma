import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoLugarId } from "@/modules/territorio";
import type { NodoDeSubarbol } from "@/modules/territorio/application/puertos";
import { cabeceraDeLugar } from "./cabeceraDeLugar";

const RAIZ = comoLugarId("11111111-1111-4111-8111-111111111111");
const A = comoLugarId("22222222-2222-4222-8222-222222222222");
const B = comoLugarId("33333333-3333-4333-8333-333333333333");

const lugar = (
  id: typeof A,
  nombre: string,
  padreId: typeof A,
): NodoDeSubarbol => ({ clase: "lugar", id, tipo: "colonia", nombre, padreId });

const cuantas = (html: string, texto: string) => html.split(texto).length - 1;

describe("cabeceraDeLugar", () => {
  it("con un ciclo de padre en los nodos termina y no repite eslabones", () => {
    const nodos = [lugar(A, "Lugar A", B), lugar(B, "Lugar B", A)];
    const cabecera = cabeceraDeLugar({ id: RAIZ, nombre: "Raiz R" }, nodos, {
      id: B,
      tipo: "colonia",
      nombre: "Lugar B",
    });
    const html = renderToStaticMarkup(<>{cabecera.migaja}</>);

    expect(cabecera.titulo).toBe("Lugar B");
    expect(cuantas(html, "Raiz R")).toBe(1);
    expect(cuantas(html, "Lugar A")).toBe(1);
    expect(cuantas(html, "Lugar B")).toBe(1);
  });

  it("sin ciclo arma la cadena de la raiz al nodo", () => {
    const nodos = [lugar(A, "Lugar A", RAIZ), lugar(B, "Lugar B", A)];
    const cabecera = cabeceraDeLugar({ id: RAIZ, nombre: "Raiz R" }, nodos, {
      id: B,
      tipo: "colonia",
      nombre: "Lugar B",
    });
    const html = renderToStaticMarkup(<>{cabecera.migaja}</>);

    expect(html.indexOf("Raiz R")).toBeLessThan(html.indexOf("Lugar A"));
    expect(html.indexOf("Lugar A")).toBeLessThan(html.indexOf("Lugar B"));
  });
});
