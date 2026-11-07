import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./actions/altaDeCalleAction", () => ({ altaDeCalleAction: vi.fn() }));
vi.mock("./actions/altaDeLugarAction", () => ({ altaDeLugarAction: vi.fn() }));
vi.mock("./PanelDeCalle", () => ({
  PanelDeCalle: () => <section data-panel="calle" className="lg:col-start-2" />,
}));

const { TabDeCalles } = await import("./TabDeCalles");
const { TabDeLugares } = await import("./TabDeLugares");
const { VistaDeRaices } = await import("./VistaDeRaices");

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const calle = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: raizId,
  punto: null,
};

const props = (accion: AccionDeNodo | undefined): PropsDeContenido => ({
  raizId,
  lugar: { id: raizId, tipo: "cabecera", nombre: "Motul" },
  nodos: [
    {
      clase: "lugar",
      id: coloniaId,
      tipo: "colonia",
      nombre: "Centro",
      padreId: raizId,
    },
  ],
  calles: [calle],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
});

/** `a` aparece en el HTML antes que `b`; los dos tienen que estar. */
const antesDe = (html: string, a: string, b: string) => {
  expect(html).toContain(a);
  expect(html).toContain(b);
  expect(html.indexOf(a)).toBeLessThan(html.indexOf(b));
};

const ANCLA = 'id="panel-de-alta"';

/**
 * A1 de la auditoria visual: lo que se abre aparecia debajo de la lista
 * completa, fuera de la pantalla de 1366x768 y del celular. Ahora va antes
 * de la lista, con el ancla a la que apunta el enlace que lo abre.
 */
describe("el alta de calle se abre a la vista", () => {
  it("va antes de la lista, con el ancla y su margen de scroll", () => {
    const html = renderToStaticMarkup(<TabDeCalles {...props("calle")} />);

    antesDe(html, "Agregar una calle en Motul", "Calle 21");
    expect(html).toMatch(/<section[^>]*id="panel-de-alta"[^>]*scroll-mt-/);
  });

  it("el enlace que la abre aterriza en el ancla", () => {
    const html = renderToStaticMarkup(<TabDeCalles {...props(undefined)} />);

    expect(html).toContain("accion=calle#panel-de-alta");
  });

  it("el panel de la calle va antes de la lista y a la derecha desde 1024px", () => {
    const html = renderToStaticMarkup(
      <TabDeCalles {...props(undefined)} calleId={calle.id} />,
    );

    antesDe(html, 'data-panel="calle"', 'aria-label="Calle 21');
  });
});

describe("el alta de lugar se abre a la vista", () => {
  it("va antes de la lista de lugares, con el ancla", () => {
    const html = renderToStaticMarkup(<TabDeLugares {...props("lugar")} />);

    antesDe(html, "Nueva colonia en Motul", "Lugares dentro de Motul");
    expect(html).toContain(ANCLA);
  });

  it("el enlace que la abre aterriza en el ancla", () => {
    const html = renderToStaticMarkup(<TabDeLugares {...props(undefined)} />);

    expect(html).toContain("accion=lugar#panel-de-alta");
  });
});

const raiz = {
  id: raizId,
  nombre: "Motul",
  tipo: "cabecera" as const,
  padreId: null,
};

const entrada = (altaAbierta: boolean) =>
  renderToStaticMarkup(
    <VistaDeRaices
      raices={[raiz]}
      lugares={[raiz]}
      hayCabecera
      puedeEscribir
      altaAbierta={altaAbierta}
    />,
  );

describe("el alta de asentamiento en la entrada", () => {
  it("abierta, va antes del arbol con el ancla", () => {
    const html = entrada(true);

    antesDe(html, ANCLA, "Asentamientos del municipio");
  });

  it("cerrada, se ofrece al pie del arbol como secundaria hacia el ancla", () => {
    const html = entrada(false);

    antesDe(
      html,
      "Asentamientos del municipio",
      'href="/territorio?accion=lugar#panel-de-alta"',
    );
    expect(html.match(/Agregar comisaría/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("Agregar asentamiento");
  });

  it("con cabecera, el panel abierto se titula Nueva comisaría", () => {
    const html = entrada(true);

    expect(html).toContain("Nueva comisaría");
    expect(html).not.toContain("Agregar asentamiento");
  });

  it("sin cabecera, la entrada sigue diciendo Agregar asentamiento", () => {
    const html = renderToStaticMarkup(
      <VistaDeRaices
        raices={[]}
        lugares={[]}
        hayCabecera={false}
        puedeEscribir
        altaAbierta={false}
      />,
    );

    expect(html.match(/Agregar asentamiento/g) ?? []).toHaveLength(1);
  });

  it("sin permiso de escritura no se ofrece", () => {
    const html = renderToStaticMarkup(
      <VistaDeRaices
        raices={[raiz]}
        lugares={[raiz]}
        hayCabecera
        puedeEscribir={false}
        altaAbierta={false}
      />,
    );

    expect(html).not.toContain("accion=lugar");
  });
});
