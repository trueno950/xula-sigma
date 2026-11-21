import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Marca } from "@/shared/marca";
import { SeccionesDeMarca } from "./SeccionesDeMarca";

/**
 * S5: cada seccion de `/marca` —el escudo, los colores y el restablecimiento—
 * tiene su titulo, y el titulo sigue a la vista cuando la fila esta plegada.
 *
 * S7: la pantalla muestra el escudo actual o «Sin escudo», y solo ofrece
 * quitarlo cuando hay algo que quitar.
 *
 * Las filas son `<details name>` compartido: se abre una a la vez y funciona
 * sin JavaScript, igual que el pie del panel (`ItemDeAccion`). El cuerpo de
 * cada fila trae su propio POST nativo.
 */

vi.mock("./actions/cambiarColoresAction", () => ({
  cambiarColoresAction: "colores-action",
}));
vi.mock("./actions/cambiarEscudo.action", () => ({
  cambiarEscudoAction: "escudo-action",
}));
vi.mock("./actions/restablecerColoresAction", () => ({
  restablecerColoresAction: "restablecer-action",
}));
vi.mock("./actions/quitarEscudoAction", () => ({
  quitarEscudoAction: "quitar-escudo-action",
}));

const ESCUDO = "https://assets.prueba.local/motul/escudo.png";

const CON_ESCUDO: Marca = {
  escudo: ESCUDO,
  primario: "oklch(0.44 0.1 155)",
  secundario: "#e07800",
};

const html = (marca: Marca) =>
  renderToStaticMarkup(
    <SeccionesDeMarca nombre="Motul" marca={marca} errorDeEscudo={undefined} />,
  );

const resumenes = (markup: string): string[] =>
  markup
    .split("<summary")
    .slice(1)
    .map((trozo) => trozo.slice(0, trozo.indexOf("</summary>")));

describe("SeccionesDeMarca", () => {
  it("son tres filas plegables de un solo grupo, con la primera abierta", () => {
    const markup = html(CON_ESCUDO);
    const detalles = markup.match(/<details[^>]*>/g) ?? [];

    expect(detalles).toHaveLength(3);
    for (const detalle of detalles) {
      expect(detalle).toContain('name="seccionesDeMarca"');
    }
    expect(detalles[0]).toMatch(/\sopen/);
    expect(detalles[1]).not.toMatch(/\sopen/);
    expect(detalles[2]).not.toMatch(/\sopen/);
  });

  it("cada fila lleva su titulo en el resumen, a la vista aunque este cerrada (S5)", () => {
    const titulos = (
      html(CON_ESCUDO).match(/<summary[\s\S]*?<\/summary>/g) ?? []
    ).map((resumen) => /<h2[^>]*>([^<]+)<\/h2>/.exec(resumen)?.[1]);

    expect(titulos).toEqual([
      "Escudo del ayuntamiento",
      "Colores del municipio",
      "Restablecer colores",
    ]);
  });

  it("la fila cerrada dice su estado actual en una linea", () => {
    const [, colores, restablecer] = resumenes(html(CON_ESCUDO));

    expect(colores).toContain("Verde");
    expect(colores).toContain("#e07800");
    expect(restablecer).toContain("Guinda");
    expect(restablecer).toContain("No toca el escudo");
  });

  it("la fila del escudo dice que hay y ofrece el escudo actual (S7)", () => {
    const markup = html(CON_ESCUDO);

    expect(resumenes(markup)[0]).toContain("Con escudo");
    expect(markup).toContain(`src="${ESCUDO}"`);
    expect(markup).toContain("Escudo actual");
  });

  it("con escudo se ofrece quitarlo, con su propio POST nativo (S7)", () => {
    const markup = html(CON_ESCUDO);

    expect(markup).toContain('action="quitar-escudo-action"');
    expect(markup).toContain("Quitar escudo");
  });

  it("sin escudo la fila lo dice y no hay nada que quitar (S7)", () => {
    const markup = html({ primario: "oklch(0.44 0.1 155)" });

    expect(resumenes(markup)[0]).toContain("Sin escudo");
    expect(markup).not.toContain("quitar-escudo-action");
    expect(markup).not.toContain("<img");
  });

  it("conserva la subida del escudo y el restablecimiento como POST nativo (S6)", () => {
    const markup = html(CON_ESCUDO);

    expect(markup).toContain('action="escudo-action"');
    expect(markup).toContain('name="escudo"');
    expect(markup).toContain('action="restablecer-action"');
    expect(markup).toContain('action="colores-action"');
  });
});
