import { describe, expect, it, vi } from "vitest";
import {
  conPunto,
  detalles,
  panelDe,
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

describe("acciones de calle con divulgacion progresiva", () => {
  it("con punto son tres details exclusivos, Ubicar es un enlace y la baja va al final", () => {
    const html = renderTab({ seleccionada: conPunto });
    const items = detalles(html);

    expect(items).toHaveLength(3);
    for (const item of items)
      expect(item).toContain('name="acciones-de-calle"');
    expect(html.indexOf("Renombrar")).toBeLessThan(
      html.indexOf("Mover a otro lugar"),
    );
    expect(html.indexOf("Mover a otro lugar")).toBeLessThan(
      html.lastIndexOf("Dar de baja"),
    );
  });

  it("con punto todo queda cerrado y Ubicar es un enlace que abre el mapa", () => {
    const html = renderTab({ seleccionada: conPunto });

    for (const item of detalles(html)) expect(item).not.toContain("open");
    expect(html).toContain(`accion=ubicarCalle&amp;calle=${conPunto.id}`);
  });

  it("sin punto, Ubicar abre por defecto con el formulario y el mapa", () => {
    const html = renderTab({ seleccionada: sinPunto });
    const items = detalles(html);

    expect(items).toHaveLength(4);
    expect(items.filter((item) => item.includes("open"))).toHaveLength(1);
    expect(items[0]).toContain("open");
    expect(html).toContain("Guardar ubicación");
    expect(html).toContain("Toque el mapa o escriba las coordenadas");
  });

  it("una accion pedida abre su detalle y no el de Ubicar", () => {
    const html = renderTab({
      seleccionada: sinPunto,
      accion: "renombrarCalle",
    });
    const abiertos = detalles(html).filter((item) => item.includes("open"));

    expect(abiertos).toHaveLength(1);
    expect(html).not.toContain("Guardar ubicación");
  });

  it("la baja usa la variante de peligro y ninguna accion es un boton de marca", () => {
    const completo = renderTab({ seleccionada: conPunto });
    const html = panelDe(completo);

    expect(html).toContain("border-senial-error");
    expect(html).not.toMatch(/<(a|summary)[^>]*bg-marca/);
    expect(html).not.toMatch(/<(a|button|summary)[^>]*[ "]w-full/);
  });

  it("un rol sin permiso no ve acciones ni details", () => {
    const html = renderTab({ seleccionada: conPunto, rol: "OPERADOR" });

    expect(detalles(html)).toHaveLength(0);
    expect(html).toContain("Su rol no permite administrar");
  });
});
