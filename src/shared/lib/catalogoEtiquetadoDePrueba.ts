import { describe, expect, it } from "vitest";

/**
 * Las tres propiedades que toda tabla de etiquetas de un catalogo cerrado
 * tiene que cumplir. `Record<Union, string>` ya obliga al compilador a
 * exigir una etiqueta por miembro; esto cierra lo que el tipo no ve: una
 * clave de mas que dejo de ser miembro, una etiqueta que sigue siendo el
 * codigo crudo y dos miembros que se leen igual.
 */
export function describirCatalogoEtiquetado(
  nombre: string,
  codigos: readonly string[],
  etiquetas: Readonly<Record<string, string>>,
): void {
  describe(`etiquetas de ${nombre}`, () => {
    it("cubre cada miembro del catalogo y ninguna clave de mas", () => {
      expect(Object.keys(etiquetas).sort()).toEqual([...codigos].sort());
    });

    it("se leen como texto para una persona y no como el codigo", () => {
      for (const codigo of codigos) {
        const etiqueta = etiquetas[codigo] ?? "";

        expect(etiqueta, codigo).not.toBe("");
        expect(etiqueta, codigo).not.toBe(codigo);
        expect(etiqueta, codigo).not.toContain("_");
        expect(etiqueta, codigo).toMatch(/^\p{Lu}\p{Ll}/u);
        expect(etiqueta, codigo).not.toMatch(/\p{Lu}{2,}/u);
      }
    });

    it("no repite etiqueta entre miembros", () => {
      const etiquetasDeLosMiembros = codigos.map((c) => etiquetas[c]);

      expect(new Set(etiquetasDeLosMiembros).size).toBe(codigos.length);
    });
  });
}
