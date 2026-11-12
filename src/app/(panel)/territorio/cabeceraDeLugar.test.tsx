import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoLugarId } from "@/modules/territorio";
import type { NodoDeSubarbol } from "@/modules/territorio/application/puertos";
import { cabeceraDeLugar } from "./cabeceraDeLugar";

const RAIZ = comoLugarId("11111111-1111-4111-8111-111111111111");
const A = comoLugarId("22222222-2222-4222-8222-222222222222");
const B = comoLugarId("33333333-3333-4333-8333-333333333333");
const REGRESO = "/padron/88888888-8888-4888-8888-888888888888";

const lugar = (
  id: typeof A,
  nombre: string,
  padreId: typeof A,
): NodoDeSubarbol => ({ clase: "lugar", id, tipo: "colonia", nombre, padreId });

const cuantas = (html: string, texto: string) => html.split(texto).length - 1;

const cabeceraDeCadena = (regreso?: string) =>
  cabeceraDeLugar({
    raiz: { id: RAIZ, nombre: "Raiz R" },
    nodos: [lugar(A, "Lugar A", RAIZ), lugar(B, "Lugar B", A)],
    nodo: { id: B, tipo: "colonia", nombre: "Lugar B" },
    ...(regreso ? { regreso } : {}),
  });

describe("cabeceraDeLugar", () => {
  it("con un ciclo de padre en los nodos termina y no repite eslabones", () => {
    const cabecera = cabeceraDeLugar({
      raiz: { id: RAIZ, nombre: "Raiz R" },
      nodos: [lugar(A, "Lugar A", B), lugar(B, "Lugar B", A)],
      nodo: { id: B, tipo: "colonia", nombre: "Lugar B" },
    });
    const html = renderToStaticMarkup(cabecera.migaja);

    expect(cabecera.titulo).toBe("Lugar B");
    expect(cuantas(html, "Raiz R")).toBe(1);
    expect(cuantas(html, "Lugar A")).toBe(1);
    expect(cuantas(html, "Lugar B")).toBe(1);
  });

  it("sin ciclo arma la cadena de la raiz al nodo", () => {
    const html = renderToStaticMarkup(cabeceraDeCadena().migaja);

    expect(html.indexOf("Raiz R")).toBeLessThan(html.indexOf("Lugar A"));
    expect(html.indexOf("Lugar A")).toBeLessThan(html.indexOf("Lugar B"));
  });

  /**
   * S4 de `territorio-seguimiento`: la migaja del arbol es la unica salida
   * de un lugar hondo, y quien llego desde la ficha de una persona la
   * conserva en cada eslabon que se puede clickear.
   */
  it("los eslabones de la migaja conservan el regreso", () => {
    const html = renderToStaticMarkup(cabeceraDeCadena(REGRESO).migaja);

    expect(html).toContain(
      `/territorio?raiz=${RAIZ}&amp;nodo=${RAIZ}&amp;regreso=${encodeURIComponent(REGRESO)}`,
    );
    expect(html).toContain(
      `/territorio?raiz=${RAIZ}&amp;nodo=${A}&amp;regreso=${encodeURIComponent(REGRESO)}`,
    );
  });

  it("sin regreso, la migaja no lo agrega", () => {
    expect(renderToStaticMarkup(cabeceraDeCadena().migaja)).not.toContain(
      "regreso=",
    );
  });
});
