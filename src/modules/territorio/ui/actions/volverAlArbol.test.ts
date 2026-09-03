import { describe, expect, it } from "vitest";
import { rutaDelArbol } from "./volverAlArbol";

/**
 * La ruta a la que vuelven las acciones de territorio.
 *
 * Se prueba aparte del `redirect` porque el destino es lo unico que tiene
 * decisiones: que parametro se escribe, cual se omite y que pasa cuando no
 * queda ninguno. Llamar a `redirect` seria probar a Next.
 */
describe("rutaDelArbol", () => {
  it("sin raiz ni nodo va al listado, sin `?` colgando", () => {
    expect(rutaDelArbol({})).toBe("/territorio");
  });

  it("omite el nodo cuando no hay, en vez de escribirlo vacio", () => {
    expect(rutaDelArbol({ raiz: "r1" })).toBe("/territorio?raiz=r1");
  });

  it("escribe raiz y nodo cuando estan los dos", () => {
    expect(rutaDelArbol({ raiz: "r1", nodo: "n1" })).toBe(
      "/territorio?raiz=r1&nodo=n1",
    );
  });

  /**
   * El mensaje viaja en la query y lo escribe el servidor, pero pasa por
   * `URLSearchParams`: sin escapar, un `&` adentro del texto partia el
   * mensaje en dos parametros.
   */
  it("escapa el mensaje de error", () => {
    expect(rutaDelArbol({ raiz: "r1", error: "Falla A & B" })).toBe(
      "/territorio?raiz=r1&error=Falla+A+%26+B",
    );
  });
});
