import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  leerMarca,
  PRIMARIO_POR_DEFECTO,
  PRIMARIO_TEXTO_POR_DEFECTO,
  validarMarca,
} from "./validacion";

describe("leerMarca", () => {
  it("acepta una marca bien formada", () => {
    expect(
      leerMarca({
        primario: "#7a1f2b",
        escudo: "https://r2.example/escudo.png",
      }),
    ).toEqual({ primario: "#7a1f2b", escudo: "https://r2.example/escudo.png" });
  });

  it("un color con CSS adentro no queda en la marca resultante", () => {
    /**
     * El caso que justifica validar: `red;background:url(//x)` viene de
     * una columna `jsonb` que alguien edita. Que no termine inyectado en
     * un `style` es responsabilidad de `variablesDeMarca`
     * (`shared/ui/marca.test.ts`); aca se prueba solo que `leerMarca` lo
     * descarta.
     */
    const marca = leerMarca({ primario: "red;background:url(//maligno)" });

    expect(marca.primario).toBeUndefined();
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

describe("validarMarca", () => {
  /**
   * `leerMarca` colapsa "vacia" e "invalida" en el mismo `{}`: es lo que
   * `validarMarca` tiene que distinguir para que escribir un escudo sobre
   * una marca sin colores no se confunda con escribirlo sobre una marca
   * con un color roto.
   */
  it("una marca vacia es valida y no invalida", () => {
    expect(validarMarca({})).toEqual({ ok: true, marca: {} });
  });

  it("un color que trae CSS adentro falla nombrando el campo", () => {
    const resultado = validarMarca({ primario: "url(//x)" });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(Object.keys(resultado.campos)).toContain("primario");
    }
  });

  it("una marca bien formada es valida", () => {
    const marca = { primario: "#7a1f2b", escudo: "https://r2.example/e.png" };

    expect(validarMarca(marca)).toEqual({ ok: true, marca });
  });

  it("un par sin contraste falla nombrando el par, no un color", () => {
    const resultado = validarMarca({
      primario: "#7a1f2b",
      primarioTexto: "#000000",
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(Object.keys(resultado.campos)).toEqual(["contraste"]);
    }
  });
});
