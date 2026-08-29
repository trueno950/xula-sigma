import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reglas, revisar } from "./index";

describe("el catalogo de reglas", () => {
  it("no repite identificadores", () => {
    const ids = reglas.map((regla) => regla.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada regla apunta a su antipatron de AGENTS.md", () => {
    for (const regla of reglas) {
      expect(regla.antipatron).toBeGreaterThan(0);
    }
  });

  /**
   * El numero de reglas vive en tres documentos, y la revision del PR que
   * introdujo estas reglas encontro que uno decia nueve.
   *
   * La version anterior de esta guarda era `expect(reglas).toHaveLength(8)`
   * con un comentario que decia hacer fallar el build "cuando vuelvan a
   * divergir". Solo fallaba en una direccion: agregar una novena regla sin
   * tocar los documentos. Editar un documento para que dijera nueve seguia
   * en verde, que es exactamente la divergencia que ya habia pasado. Un
   * comentario que promete mas de lo que el test hace es el antipatron 24, y
   * era el propio verificador de antipatrones quien lo tenia.
   *
   * Ahora lee los tres archivos. El numeral se busca solo donde una linea
   * que nombra `pnpm reglas` lo pega a "antipatrones" o "puntos": el ADR
   * tambien dice "los dos modos de falla" en una linea que lo nombra, y
   * contar cualquier numeral de esas lineas daba un falso positivo.
   */
  const NUMERALES = [
    "cero",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
  ];

  const DOCUMENTOS = [
    "CLAUDE.md",
    "docs/04-calidad.md",
    "docs/adr/0001-decisiones-tecnicas-fase-0.md",
  ];

  const numeralesEn = (ruta: string): string[] => {
    const lineas = readFileSync(ruta, "utf8")
      .split("\n")
      .filter((linea) => linea.includes("pnpm reglas"));

    return NUMERALES.filter((numeral) =>
      lineas.some((linea) =>
        new RegExp(
          `\\b${numeral}\\b[^.]{0,30}\\b(antipatrones|puntos)\\b`,
          "i",
        ).test(linea),
      ),
    );
  };

  for (const documento of DOCUMENTOS) {
    it(`${documento} dice cuantas reglas hay, y coincide`, () => {
      expect(numeralesEn(documento)).toEqual([NUMERALES[reglas.length]]);
    });
  }

  /**
   * El ADR no solo cuenta: enumera los antipatrones cubiertos. Es la
   * afirmacion mas detallada de las tres y la que mas facil envejece.
   */
  it("el ADR enumera los antipatrones que el catalogo cubre", () => {
    const adr = readFileSync(DOCUMENTOS[2] ?? "", "utf8");
    const linea = adr
      .split("\n")
      .find(
        (una) => una.includes("pnpm reglas") && una.includes("antipatrones"),
      );

    const enumerados = [...(linea ?? "").matchAll(/\d+/g)].map((n) =>
      Number(n[0]),
    );
    const cubiertos = [
      ...new Set(reglas.map((regla) => regla.antipatron)),
    ].sort((a, b) => a - b);

    expect(enumerados).toEqual(cubiertos);
  });

  it("no encuentra nada en un repositorio vacio", () => {
    expect(revisar([])).toEqual([]);
  });
});
