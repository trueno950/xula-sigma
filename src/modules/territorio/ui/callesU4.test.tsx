import { describe, expect, it, vi } from "vitest";
import {
  conPunto,
  panelDe,
  raizId,
  renderTab,
  sinPunto,
} from "./callesU4DePrueba";

vi.mock("./actions/altaDeCalleAction", () => ({ altaDeCalleAction: vi.fn() }));
vi.mock("./actions/darDeBajaCalleAction", () => ({
  darDeBajaCalleAction: vi.fn(),
}));
vi.mock("./actions/reparentearCalleAction", () => ({
  reparentearCalleAction: vi.fn(),
}));
vi.mock("./actions/renombrarCalleAction", () => ({
  renombrarCalleAction: vi.fn(),
}));
vi.mock("./actions/ubicarCalleAction", () => ({ ubicarCalleAction: vi.fn() }));

describe("fila seleccionada de calles", () => {
  it("marca solo la fila de la calle abierta con aria-current", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-label="Calle 15[^"]*"[^>]*aria-current="true"/);
  });

  it("sin seleccion ninguna fila queda marcada", () => {
    expect(renderTab()).not.toContain("aria-current");
  });

  it("la tabla informa si cada calle esta ubicada sin imprimir coordenadas", () => {
    const html = renderTab();

    expect(html).toContain("Ubicada");
    expect(html).toContain("Sin ubicar");
    expect(html).not.toContain("20.900000, -89.600000");
  });

  it("cada fila enlaza a su calle y aterriza en el panel", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html).toContain(`calle=${sinPunto.id}#panel-de-calle`);
    expect(html).toContain(`calle=${conPunto.id}#panel-de-calle`);
  });
});

describe("panel de calle como detalle", () => {
  it("lleva el ancla del panel y se ubica junto a la tabla desde 1024px", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html).toContain('id="panel-de-calle"');
    expect(html).toContain("scroll-mt-");
    expect(html).toContain("lg:grid-cols-");
    expect(html).toContain("lg:col-start-2 lg:row-start-1 lg:sticky");
  });

  it("Cerrar vuelve a la lista sin calle", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html).toContain(
      `href="/territorio?raiz=${raizId}&amp;nodo=${raizId}&amp;vista=calles"`,
    );
    expect(html).toContain("Cerrar");
  });

  it("muestra Ubicada como estado y conserva las coordenadas como dato secundario", () => {
    const panel = panelDe(renderTab({ seleccionada: conPunto }));

    expect(panel).toContain("Ubicada");
    expect(panel).toContain("20.900000, -89.600000");
    expect(panel).not.toContain("Sin ubicar");
  });

  it("una calle sin punto muestra Sin ubicar como estado principal", () => {
    const html = renderTab({ seleccionada: sinPunto });

    expect(html).toContain("Sin ubicar");
    expect(html).not.toContain("Sin punto");
  });

  it("enlaza al historial y al mapa operativo con icono y palabras", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html).toContain(`href="/calles/${conPunto.id}/historial"`);
    expect(html).toContain("Ver historial de la calle");
    expect(html).toContain('href="/mapa-operativo"');
    expect(html).toContain("Ver en el mapa operativo");
  });
});
