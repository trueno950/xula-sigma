import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/buscarDomiciliosAction", () => ({
  buscarDomiciliosAction: vi.fn(),
}));

const { SelectorDeDomicilioDeMudanza } = await import(
  "./SelectorDeDomicilioDeMudanza"
);

const ELEGIDO = "22222222-2222-4222-8222-222222222222";
const domicilios = [
  {
    valor: "11111111-1111-4111-8111-111111111111",
    etiqueta: "Calle 20 #10, Centro",
  },
  { valor: ELEGIDO, etiqueta: "Calle 38 #157, Centro" },
];

/**
 * El primer pintado de la isla es el del servidor: con un domicilio
 * preseleccionado el `<select>` ya lo trae elegido, y al montar la isla se
 * queda en la lista porque hay un valor (el efecto no cambia al buscador).
 */
describe("SelectorDeDomicilioDeMudanza", () => {
  it("empieza con el domicilio preseleccionado elegido y su etiqueta visible", () => {
    const html = renderToStaticMarkup(
      <SelectorDeDomicilioDeMudanza
        domicilios={domicilios}
        preseleccionado={ELEGIDO}
      />,
    );

    expect(html).toContain(
      `<option value="${ELEGIDO}" selected="">Calle 38 #157, Centro</option>`,
    );
    expect(html.match(/selected=""/g)).toHaveLength(1);
  });

  it("sin preseleccion empieza en el marcador", () => {
    const html = renderToStaticMarkup(
      <SelectorDeDomicilioDeMudanza domicilios={domicilios} />,
    );

    expect(html).toMatch(/<option value="" disabled="" selected="">/);
    expect(html.match(/selected=""/g)).toHaveLength(1);
  });
});
