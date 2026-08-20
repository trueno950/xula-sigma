import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
    /**
     * `rebeccapurple` es un color valido de CSS y aun asi se rechaza. La
     * razon: garantizar contraste exige poder medir, y medir un nombre
     * pide cargar la tabla de los 148 nombres de CSS. Una entrada de la
     * lista blanca que no se puede medir vacia la garantia justo para el
     * municipio que escribio el color a mano, que es el que mas la
     * necesita. La marca sale de un selector, que emite hex u oklch.
     */
    expect(leerMarca({ primario: "rebeccapurple" })).toEqual({});
  });

  it("un hex con transparencia tampoco, por la misma razon", () => {
    // El contraste de un color translucido depende de lo que tenga atras,
    // y atras hay una pagina que todavia no se pinto.
    expect(leerMarca({ primario: "#7a1f2b80" })).toEqual({});
  });
});

describe("leerMarca y el contraste", () => {
  it("guinda con texto blanco pasa", () => {
    const marca = { primario: "#7a1f2b", primarioTexto: "#ffffff" };

    expect(leerMarca(marca)).toEqual(marca);
  });

  it("guinda con texto negro cae entera al defecto", () => {
    /**
     * Da 2.06 contra el piso de 4.5. Se descarta la marca completa y no
     * solo el color del texto por la misma razon que una marca invalida:
     * dejar el guinda con el texto por defecto seria elegir por el
     * municipio un par que nunca aprobo.
     */
    expect(
      leerMarca({ primario: "#7a1f2b", primarioTexto: "#000000" }),
    ).toEqual({});
  });

  it("un primario solo se mide contra el texto por defecto", () => {
    /**
     * El caso mas probable en produccion: el municipio carga su color y no
     * toca el del texto. Sin esta comparacion la reja no se enteraria,
     * porque el par que se pinta mezcla un valor de la columna con uno de
     * `globals.css`.
     *
     * Amarillo sobre el blanco por defecto da 1.07.
     */
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
    /**
     * No es un olvido de la validacion: el esquema no declara el color de
     * texto de `--accent`, asi que no hay par que medir. Este test fija el
     * hueco para que se note el dia que el design system lo declare y esto
     * empiece a estar mal.
     */
    const marca = leerMarca({ primario: "#1f4d7a", secundario: "#000000" });

    expect(variablesDeMarca(marca)).toEqual({
      "--primary": "#1f4d7a",
      "--accent": "#000000",
    });
  });
});
