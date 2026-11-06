import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CalleId, LugarId } from "@/modules/territorio";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";

// Los stubs de nodo y contenido: el motivo esta en `page.test.tsx`.
vi.mock("@/modules/territorio", () => ({
  PanelDeNodo: () => <div data-panel-de-nodo />,
  ContenidoDeLugar: () => <div data-contenido />,
}));

const { VistaDeLugar } = await import("./VistaDeLugar");
const { accionesDeRaiz } = await import("./AccionesDeRaiz");
const { EnlacesDeLaEntrada } = await import("./EnlacesDeLaEntrada");

const RAIZ = "11111111-1111-4111-8111-111111111111" as LugarId;
const nodo = { id: RAIZ, tipo: "cabecera" as const, nombre: "Tepakan" };

const vista = (domicilioAbierto: boolean) =>
  renderToStaticMarkup(
    <VistaDeLugar
      raiz={nodo}
      nodos={[{ clase: "lugar", ...nodo, padreId: null }]}
      nodo={nodo}
      calles={[
        {
          id: "22222222-2222-4222-8222-222222222222" as CalleId,
          nombre: "Calle 20",
          lugarId: RAIZ,
          punto: null,
        },
      ]}
      lugares={[nodo]}
      vista="domicilios"
      accion={undefined}
      calleId={undefined}
      domicilioId={undefined}
      domicilio={undefined}
      permisos={permisosDeTerritorio("OPERADOR")}
      domicilioAbierto={domicilioAbierto}
    />,
  );

/** A1 de la auditoria visual: el alta salia debajo de la lista completa. */
describe("el alta de domicilio dentro de un lugar", () => {
  it("va antes de la lista, con el ancla y su margen de scroll", () => {
    const html = vista(true);

    expect(html).toMatch(/<section[^>]*id="panel-de-alta"[^>]*scroll-mt-/);
    expect(html.indexOf('name="calleId"')).toBeGreaterThan(-1);
    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf("data-contenido"),
    );
  });

  it("el enlace que la abre aterriza en el ancla", () => {
    expect(vista(false)).toContain("accion=domicilio#panel-de-alta");
  });
});

const enlaces = (html: string) => html.match(/<a\b[^>]*>/g) ?? [];

/** M2: cuatro botones en la cabecera, apilados en cuatro anchos en movil. */
describe("la cabecera de la entrada", () => {
  it("lleva una sola accion, la primaria, hacia el ancla del alta", () => {
    const html = renderToStaticMarkup(
      accionesDeRaiz({ puedeCrearLugar: true, accion: undefined }),
    );

    expect(enlaces(html)).toHaveLength(1);
    expect(html).toContain('href="/territorio?accion=domicilio#panel-de-alta"');
    expect(html).toContain("Registrar domicilio");
    expect(html).not.toContain("Agregar asentamiento");
  });

  it("en movil la accion ocupa el ancho", () => {
    const html = renderToStaticMarkup(
      accionesDeRaiz({ puedeCrearLugar: true, accion: undefined }),
    );

    expect(html).toMatch(/class="[^"]*\[&amp;&gt;a\]:w-full/);
  });

  it("con el alta abierta, o sin permiso, no hay accion", () => {
    expect(
      accionesDeRaiz({ puedeCrearLugar: true, accion: "domicilio" }),
    ).toBeNull();
    expect(
      accionesDeRaiz({ puedeCrearLugar: false, accion: undefined }),
    ).toBeNull();
  });

  it("el registro y las zonas son enlaces de contexto, no botones", () => {
    const html = renderToStaticMarkup(<EnlacesDeLaEntrada />);

    expect(html).toMatch(/^<nav[^>]*aria-label="[^"]+"/);
    expect(html).toContain('href="/territorio/domicilios"');
    expect(html).toContain("Ver registro de domicilios");
    expect(html).toContain('href="/territorio/zonas"');
    expect(html).toContain("Zonas operativas");
    for (const enlace of enlaces(html)) {
      expect(enlace).toContain("underline");
      expect(enlace).not.toContain("bg-marca");
      expect(enlace).not.toContain("border-caliza-borde");
    }
  });
});
