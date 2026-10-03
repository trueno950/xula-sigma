import { describe, expect, it } from "vitest";
import { cerrarAlInteractuar } from "./cerrarAlInteractuar";

const crear = () => {
  const documento = new EventTarget();
  const dentro = {} as Node;
  const fuera = {} as Node;
  const menu = {
    open: true,
    contains: (nodo: Node) => nodo === dentro,
  };
  const quitar = cerrarAlInteractuar(menu, documento);
  const pulsar = (tecla: string) =>
    documento.dispatchEvent(
      Object.assign(new Event("keydown"), { key: tecla }),
    );
  const clic = (objetivo: Node) => {
    const evento = new Event("pointerdown");

    Object.defineProperty(evento, "target", { value: objetivo });
    documento.dispatchEvent(evento);
  };

  return { menu, dentro, fuera, quitar, pulsar, clic };
};

describe("cerrarAlInteractuar", () => {
  it("cierra con Escape", () => {
    const { menu, pulsar } = crear();

    pulsar("Escape");

    expect(menu.open).toBe(false);
  });

  it("ignora otras teclas", () => {
    const { menu, pulsar } = crear();

    pulsar("Enter");

    expect(menu.open).toBe(true);
  });

  it("cierra con un clic fuera y no con uno dentro", () => {
    const { menu, dentro, fuera, clic } = crear();

    clic(dentro);
    expect(menu.open).toBe(true);

    clic(fuera);
    expect(menu.open).toBe(false);
  });

  it("deja de escuchar al limpiar", () => {
    const { menu, quitar, pulsar } = crear();

    quitar();
    pulsar("Escape");

    expect(menu.open).toBe(true);
  });
});
