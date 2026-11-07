import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoLugarId } from "../domain";

vi.mock("./actions/altaDeLugarAction", () => ({ altaDeLugarAction: vi.fn() }));

const { FormularioDeAltaDeLugar } = await import("./FormularioDeAltaDeLugar");

const padreId = comoLugarId("11111111-1111-4111-8111-111111111111");

/**
 * S1 de `odd/tasks/territorio-formularios.md`: un select de una sola opcion
 * es un paso de mas, y vacio lo frena el navegador antes de enviar.
 */
describe("el alta de lugar con un solo tipo posible", () => {
  it("dentro de un asentamiento manda colonia oculta, sin select", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeLugar padreId={padreId} tipoDelPadre="comisaria" />,
    );

    expect(html).toContain(
      '<input type="hidden" name="tipo" value="colonia"/>',
    );
    expect(html).not.toContain("<select");
    expect(html).not.toContain("Seleccione un tipo");
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Agregar colonia<\/button>/,
    );
  });

  it("en la raiz con cabecera manda comisaria oculta", () => {
    const html = renderToStaticMarkup(<FormularioDeAltaDeLugar hayCabecera />);

    expect(html).toContain(
      '<input type="hidden" name="tipo" value="comisaria"/>',
    );
    expect(html).not.toContain("<select");
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Agregar comisaría<\/button>/,
    );
  });

  it("con dos tipos posibles conserva el select y Dar de alta", () => {
    const html = renderToStaticMarkup(<FormularioDeAltaDeLugar />);

    expect(html).toMatch(/<select id="lugar-tipo"[^>]*name="tipo"/);
    expect(html).not.toContain('type="hidden" name="tipo"');
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Dar de alta<\/button>/,
    );
  });
});
