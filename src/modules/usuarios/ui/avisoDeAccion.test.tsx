import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvisoDeAccion } from "./AvisoDeAccion";

/**
 * S13 de `usuarios-ux` (hallazgo B2): la confirmacion de una baja dice de
 * quien, y desde cuando. S14: el aviso es de una sola vez y lo dice, porque
 * sin JavaScript el unico que lo puede repetir es el navegador, y el aviso ya
 * no esta en la base cuando eso pasa.
 *
 * La fecha se formatea por `shared/lib/fecha`: `bajaEn` es un instante en
 * UTC y la fecha civil es la de Merida.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";

const pintar = (fecha: Date | null = new Date("2026-11-16T20:00:00Z")) =>
  renderToStaticMarkup(
    <AvisoDeAccion nombre="Jose Armando May" bajaEn={fecha} token={TOKEN} />,
  );

describe("AvisoDeAccion", () => {
  it("nombra a la persona y la fecha en que se dio de baja", () => {
    const html = pintar();

    expect(html).toContain("Se dio de baja a Jose Armando May el 16 nov 2026.");
    expect(html).toContain("Ya no puede entrar al panel.");
  });

  it("dice que se muestra una sola vez y que recargar no lo repite", () => {
    expect(pintar()).toContain(
      "Este aviso se muestra una sola vez: recargar la página no lo repite.",
    );
  });

  it("sin fecha no se inventa una", () => {
    const html = pintar(null);

    expect(html).toContain("Se dio de baja a Jose Armando May.");
    expect(html).not.toContain(" el .");
  });

  it("se anuncia como estado para el lector de pantalla", () => {
    expect(pintar()).toContain('role="status"');
  });
});
