import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/cambiarUmbralDeAtrasoAction", () => ({
  cambiarUmbralDeAtrasoAction: "umbral-action",
}));

const { FormularioDeUmbralDeAtraso } = await import(
  "./FormularioDeUmbralDeAtraso"
);

const html = (umbral: number) =>
  renderToStaticMarkup(<FormularioDeUmbralDeAtraso umbral={umbral} />);

describe("FormularioDeUmbralDeAtraso", () => {
  it("precarga el umbral del municipio en un campo numerico", () => {
    const pagina = html(30);

    expect(pagina).toContain('name="diasDeAtraso"');
    expect(pagina).toContain('value="30"');
    expect(pagina).toContain('type="number"');
  });

  it("el rango de 1 a 90 se dice en el texto de ayuda, no en el navegador", () => {
    const pagina = html(7);

    expect(pagina).toContain("Del 1 al 90.");
    // Sin `min`/`max`: el mensaje del navegador no esta en espanol del
    // municipio. El rango lo rechaza la Server Action.
    expect(pagina).not.toContain('min="1"');
    expect(pagina).not.toContain('max="90"');
  });

  it("sin fila guardada precarga el valor por defecto de 7", () => {
    expect(html(7)).toContain('value="7"');
  });

  it("es un form nativo: el envio es la Server Action, sin JavaScript de por medio", () => {
    const pagina = html(7);

    expect(pagina).toContain('action="umbral-action"');
    expect(pagina).toContain(">Guardar<");
  });
});
