import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OpcionDeLista } from "@/shared/ui";
import { callesQueCoinciden, mensajeDeCoincidencias } from "./busquedaDeCalles";
import { SelectorDeCalleConBusqueda } from "./SelectorDeCalleConBusqueda";

const calles: readonly OpcionDeLista[] = [
  { valor: "a", etiqueta: "Calle 20 — Tepakan" },
  { valor: "b", etiqueta: "Calle 21 — Tepakan" },
  { valor: "c", etiqueta: "Avenida Álamo — Tepakan" },
];

const etiquetas = (opciones: readonly OpcionDeLista[]) =>
  opciones.map((opcion) => opcion.etiqueta);

describe("callesQueCoinciden", () => {
  it("sin busqueda deja la lista entera", () => {
    expect(callesQueCoinciden(calles, "   ")).toEqual(calles);
  });

  it("filtra por parte del nombre sin distinguir mayusculas ni acentos", () => {
    expect(etiquetas(callesQueCoinciden(calles, "alamo"))).toEqual([
      "Avenida Álamo — Tepakan",
    ]);
    expect(etiquetas(callesQueCoinciden(calles, "CALLE 2"))).toEqual([
      "Calle 20 — Tepakan",
      "Calle 21 — Tepakan",
    ]);
  });

  it("conserva la calle elegida aunque no coincida con la busqueda", () => {
    expect(etiquetas(callesQueCoinciden(calles, "alamo", "a"))).toEqual([
      "Calle 20 — Tepakan",
      "Avenida Álamo — Tepakan",
    ]);
  });

  it("sin coincidencias la lista queda vacia", () => {
    expect(callesQueCoinciden(calles, "zzz")).toEqual([]);
  });
});

describe("mensajeDeCoincidencias", () => {
  it("nombra el resultado en singular, en plural y en vacio", () => {
    expect(mensajeDeCoincidencias(1)).toBe("1 calle coincide.");
    expect(mensajeDeCoincidencias(7)).toBe("7 calles coinciden.");
    expect(mensajeDeCoincidencias(0)).toBe(
      "Ninguna calle coincide. Borre la búsqueda para ver la lista completa.",
    );
  });
});

describe("SelectorDeCalleConBusqueda", () => {
  const marcado = () =>
    renderToStaticMarkup(
      <SelectorDeCalleConBusqueda
        id="domicilio-calle-id"
        name="calleId"
        opciones={calles}
        marcador="Seleccione una calle"
        ayuda="La calle donde está el domicilio."
      />,
    );

  /**
   * El camino sin JavaScript es el que sostiene el formulario en la red
   * rural (PRODUCT.md): el `<select>` sale completo del servidor y el
   * buscador es solo un acortador de la lista.
   */
  it("sin JavaScript la calle se sigue eligiendo: el select nativo lleva todas las opciones", () => {
    const html = marcado();

    expect(html).toContain('name="calleId"');
    expect(html).toContain(">Seleccione una calle<");
    for (const calle of calles) {
      expect(html).toContain(`>${calle.etiqueta}<`);
    }
  });

  it("el buscador tiene su etiqueta y no viaja como campo del formulario", () => {
    const html = marcado();

    expect(html).toContain('for="domicilio-calle-id-busqueda"');
    expect(html).toMatch(
      /id="domicilio-calle-id-busqueda"(?![^>]*name=)[^>]*>/,
    );
    expect(html).toContain('aria-controls="domicilio-calle-id"');
  });

  it("sin busqueda no anuncia un conteo de coincidencias", () => {
    expect(marcado()).not.toContain('role="status"');
  });
});
