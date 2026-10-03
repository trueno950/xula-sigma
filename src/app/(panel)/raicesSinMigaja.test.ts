import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULOS_DEL_PANEL } from "@/shared/ui/modulosDelPanel";

const RAIZ = resolve(import.meta.dirname);

/**
 * `DESIGN.md`: la raiz de una seccion no lleva migaja, porque un solo paso
 * no dice nada que el titulo y la navegacion no digan. Territorio pinta su
 * raiz desde `TerritorioCargado`; el resto desde su `page.tsx`.
 */
const ARCHIVO_DE_RAIZ: Record<string, string> = {
  "/padron": "padron/(lista)/page.tsx",
  "/reportes": "reportes/page.tsx",
  "/constancias": "constancias/page.tsx",
  "/territorio": "territorio/TerritorioCargado.tsx",
  "/mapa-operativo": "mapa-operativo/page.tsx",
  "/intervenciones": "intervenciones/page.tsx",
  "/marca": "marca/page.tsx",
};

describe("raices de seccion", () => {
  it("cubre todos los modulos del panel", () => {
    expect(Object.keys(ARCHIVO_DE_RAIZ).sort()).toEqual(
      MODULOS_DEL_PANEL.map((modulo) => modulo.ruta).sort(),
    );
  });

  it.each(Object.entries(ARCHIVO_DE_RAIZ))(
    "%s no lleva migaja",
    (_, archivo) => {
      const fuente = readFileSync(resolve(RAIZ, archivo), "utf8");

      expect(fuente).not.toMatch(/migaja/i);
      expect(fuente).not.toContain("<Migaja");
    },
  );
});
