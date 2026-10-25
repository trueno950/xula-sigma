import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";
import { TabDeCalles } from "./TabDeCalles";
import type { CalleParaPanel } from "./vistaDeCalles";

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

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const sinPunto: CalleParaPanel = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: raizId,
  punto: null,
};
const conPunto: CalleParaPanel = {
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle 15",
  lugarId: raizId,
  punto: { latitud: 20.9, longitud: -89.6 },
};
const lugar = { id: raizId, tipo: "cabecera" as const, nombre: "Buenavista" };

type Opciones = {
  seleccionada?: CalleParaPanel | undefined;
  accion?: AccionDeNodo | undefined;
  rol?: "ADMIN_MUNICIPAL" | "OPERADOR";
};

const renderTab = ({
  seleccionada,
  accion,
  rol = "ADMIN_MUNICIPAL",
}: Opciones = {}) => {
  const props: PropsDeContenido = {
    raizId,
    lugar,
    nodos: [],
    calles: [sinPunto, conPunto],
    lugares: [{ id: raizId, nombre: "Buenavista", tipo: "cabecera" }],
    calleId: seleccionada?.id,
    domicilio: undefined,
    domicilioId: undefined,
    accion,
    permisos: permisosDeTerritorio(rol),
  };
  return renderToStaticMarkup(<TabDeCalles {...props} />);
};

const detalles = (html: string) =>
  html.match(/<details[^>]*>/g) ?? ([] as string[]);

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
    expect(html).toContain("lg:sticky");
  });

  it("Cerrar vuelve a la lista sin calle", () => {
    const html = renderTab({ seleccionada: conPunto });

    expect(html).toContain(
      `href="/territorio?raiz=${raizId}&amp;nodo=${raizId}&amp;vista=calles"`,
    );
    expect(html).toContain("Cerrar");
  });

  it("muestra Ubicada como estado y conserva las coordenadas como dato secundario", () => {
    const html = renderTab({ seleccionada: conPunto });
    const panel = html.slice(html.indexOf('id="panel-de-calle"'));

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
    const html = completo.slice(completo.indexOf('id="panel-de-calle"'));

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
