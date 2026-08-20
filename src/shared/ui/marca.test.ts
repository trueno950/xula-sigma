import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste } from "./contraste";
import {
  leerMarca,
  PRIMARIO_POR_DEFECTO,
  PRIMARIO_TEXTO_POR_DEFECTO,
  variablesDeMarca,
} from "./marca";

describe("leerMarca", () => {
  it("acepta una marca bien formada", () => {
    expect(
      leerMarca({
        primario: "#7a1f2b",
        escudo: "https://r2.example/escudo.png",
      }),
    ).toEqual({ primario: "#7a1f2b", escudo: "https://r2.example/escudo.png" });
  });

  it("no deja pasar un color que trae CSS adentro", () => {
    /**
     * El caso que justifica validar. Esos colores terminan en un atributo
     * `style` y salen de una columna `jsonb` que alguien edita: sin la lista
     * blanca, `red;background:url(//x)` se inyecta en el CSS de la pagina
     * que se sirve **antes de autenticar**.
     */
    const marca = leerMarca({ primario: "red;background:url(//maligno)" });

    expect(marca.primario).toBeUndefined();
    expect(JSON.stringify(variablesDeMarca(marca))).not.toContain("maligno");
  });

  it("un escudo que no es URL no se pinta", () => {
    expect(leerMarca({ escudo: "javascript:alert(1)" }).escudo).toBeUndefined();
  });

  it("una marca invalida cae entera a los valores por defecto", () => {
    /**
     * Se descarta el objeto completo y no campo por campo: una marca a
     * medias —primario del municipio, texto por defecto— puede quedar
     * ilegible, y es peor que la marca por defecto entera.
     */
    expect(leerMarca({ primario: "#7a1f2b", secundario: "url(//x)" })).toEqual(
      {},
    );
  });

  it("aguanta lo que venga de una columna jsonb", () => {
    for (const valor of [null, undefined, 42, "texto", [], {}]) {
      expect(leerMarca(valor)).toEqual({});
    }
  });

  it("un color con nombre no entra, porque no se puede medir", () => {
    // Por que quedaron afuera, en el regex `COLOR`. Lo que agrega este
    // test es el caso incomodo: `rebeccapurple` es un color valido de CSS
    // y aun asi se rechaza.
    expect(leerMarca({ primario: "rebeccapurple" })).toEqual({});
  });

  it("un hex con transparencia tampoco, por la misma razon", () => {
    expect(leerMarca({ primario: "#7a1f2b80" })).toEqual({});
  });

  it("un oklch con forma valida pero no medible tampoco entra", () => {
    /**
     * El regex acepta la forma —los caracteres son los permitidos— pero
     * `contraste.ts` no puede medirla. Se prueba por `secundario` a
     * proposito: es el unico campo que no pasa por la reja de contraste,
     * asi que es la unica puerta por la que un color no medible podia
     * llegar hasta el `style` de la pagina.
     */
    expect(leerMarca({ secundario: "oklch(0.5)" })).toEqual({});
    expect(leerMarca({ secundario: "oklch(0.5 50% 20)" })).toEqual({});
  });
});

describe("leerMarca y el contraste", () => {
  it("guinda con texto blanco pasa", () => {
    const marca = { primario: "#7a1f2b", primarioTexto: "#ffffff" };

    expect(leerMarca(marca)).toEqual(marca);
  });

  it("guinda con texto negro cae entera al defecto", () => {
    // El caso concreto que motiva la reja entera, en
    // `docs/06-frontend.md` seccion 6.
    expect(
      leerMarca({ primario: "#7a1f2b", primarioTexto: "#000000" }),
    ).toEqual({});
  });

  it("un primario solo se mide contra el texto por defecto", () => {
    // Por que se mide contra el defecto, en `PRIMARIO_POR_DEFECTO`. Lo que
    // agrega este test son los dos lados: amarillo sobre el blanco por
    // defecto da 1.07 y no entra; el azul si.
    expect(leerMarca({ primario: "#ffff00" })).toEqual({});
    expect(leerMarca({ primario: "#1f4d7a" })).toEqual({ primario: "#1f4d7a" });
  });

  it("los valores por defecto son los mismos que declara globals.css", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const declarado = (variable: string) =>
      new RegExp(`var\\(--${variable},\\s*(.+?)\\);`).exec(css)?.[1];

    expect(declarado("primary")).toBe(PRIMARIO_POR_DEFECTO);
    expect(declarado("primary-foreground")).toBe(PRIMARIO_TEXTO_POR_DEFECTO);
  });
});

describe("variablesDeMarca", () => {
  it("solo declara las variables que el municipio definio", () => {
    // Una variable en vacio pisaria el valor por defecto de `globals.css`
    // con nada, y el color quedaria sin resolver.
    expect(variablesDeMarca({ primario: "#7a1f2b" })).toEqual({
      "--primary": "#7a1f2b",
    });
  });

  it("sin marca no declara ninguna", () => {
    expect(variablesDeMarca({})).toEqual({});
  });

  it("el acento se declara sin pasar por la reja de contraste", () => {
    // Por que el acento no se mide, en `legible`. Lo que agrega este test
    // es fijar el hueco con el numero adentro: el par elegido no alcanza el
    // piso y se declara igual. El dia que el design system declare el color
    // de texto del acento, eso pasa a estar mal y rompe aca.
    const marca = leerMarca({ primario: "#1f4d7a", secundario: "#000000" });

    expect(contraste("#1f4d7a", "#000000")).toBeLessThan(CONTRASTE_MINIMO);
    expect(variablesDeMarca(marca)).toEqual({
      "--primary": "#1f4d7a",
      "--accent": "#000000",
    });
  });
});
