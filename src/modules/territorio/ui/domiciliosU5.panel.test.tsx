import { describe, expect, it, vi } from "vitest";
import { clasesDeBoton } from "@/shared/ui";
import type { PropsDeContenido } from "./contenido";
import {
  cabeceraId,
  coloniaId,
  detalles,
  nodos,
  render,
  seleccionado,
} from "./fixturasDeDomiciliosU5";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

describe("tab de domicilios: panel", () => {
  it("el panel lleva ancla, nombre de la direccion y cierra al lugar", () => {
    const html = seleccionado();

    expect(html).toContain('id="panel-de-domicilio"');
    expect(html).toContain('aria-label="Calle 21 21"');
    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${coloniaId}&amp;vista=domicilios"`,
    );
    expect(html).toContain("Cerrar");
  });

  it("la tabla y el panel van lado a lado desde lg", () => {
    expect(seleccionado()).toContain("lg:grid-cols-");
    expect(render()).not.toContain("lg:grid-cols-");
  });

  it("Corregir y Dar de baja son detalles exclusivos del mismo grupo", () => {
    const html = seleccionado();

    expect(detalles(html)).toHaveLength(2);
    for (const etiqueta of detalles(html)) {
      expect(etiqueta).toContain('name="acciones-de-domicilio"');
      expect(etiqueta).not.toContain(" open");
    }
  });

  it("la baja va al final, separada, con el boton peligro", () => {
    const html = seleccionado();
    const corregir = html.indexOf("Corregir");
    const baja = html.lastIndexOf("Dar de baja");

    expect(corregir).toBeGreaterThan(-1);
    expect(baja).toBeGreaterThan(corregir);
    expect(html).toContain(clasesDeBoton("peligro"));
    expect(html).toMatch(/border-t border-caliza-divisor pt-2">\s*<details/);
  });

  it("abre solo el detalle de la accion pedida", () => {
    const html = seleccionado({ accion: "corregirDomicilio" });
    const abiertos = detalles(html).filter((d) => d.includes(" open"));

    expect(abiertos).toHaveLength(1);
    expect(html.indexOf(abiertos[0] ?? "")).toBeLessThan(
      html.indexOf("Dar de baja"),
    );
  });

  it("nombra el lugar con enlace a su vista", () => {
    const html = seleccionado();

    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${coloniaId}&amp;vista=lugares"`,
    );
  });

  it("un rol de solo lectura ve el panel sin acciones ni detalles", () => {
    const html = seleccionado({ permisos: permisosDeTerritorio("CONSULTA") });

    expect(html).toContain("Calle 21 21");
    expect(detalles(html)).toHaveLength(0);
    expect(html).not.toContain("Corregir");
    expect(html).not.toContain("Dar de baja");
  });
});

describe("tab de domicilios: vacio", () => {
  const vacia = (resto: Partial<PropsDeContenido> = {}) =>
    render({ nodos: nodos.filter((n) => n.clase === "lugar"), ...resto });

  it("dice que no hay domicilios y deja el alta a la barra de la pestana", () => {
    const html = vacia();

    expect(html).toContain("Centro no tiene domicilios todavía.");
    expect(html).not.toContain("accion=");
  });

  it("sin calles la salida es agregar la primera calle", () => {
    const html = vacia({ calles: [] });

    expect(html).toContain("hace falta al menos una calle");
    expect(html).toContain("accion=calle");
    expect(html).not.toContain("accion=domicilio");
  });

  it("un rol de solo lectura no recibe ninguna accion", () => {
    const html = vacia({ permisos: permisosDeTerritorio("CONSULTA") });

    expect(html).toContain("Centro no tiene domicilios todavía.");
    expect(html).not.toContain("accion=domicilio");
  });
});
