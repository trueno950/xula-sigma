import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CalleId, LugarId } from "@/modules/territorio";
import {
  type PermisosDeTerritorio,
  permisosDeTerritorio,
} from "@/modules/territorio/ui/permisos";

// Los stubs de nodo y contenido: el motivo esta en `page.test.tsx`.
vi.mock("@/modules/territorio", () => ({
  PanelDeNodo: ({ vista }: { vista: string }) => (
    <div data-panel-vista={vista} />
  ),
  ContenidoDeLugar: ({ vista }: { vista: string }) => (
    <div data-contenido-vista={vista} />
  ),
}));

const { VistaDeLugar } = await import("./VistaDeLugar");

const RAIZ = "11111111-1111-4111-8111-111111111111" as LugarId;

const props = (permisos: PermisosDeTerritorio, domicilioAbierto: boolean) => ({
  raiz: { id: RAIZ, tipo: "cabecera" as const, nombre: "Tepakan" },
  nodos: [
    {
      clase: "lugar" as const,
      id: RAIZ,
      tipo: "cabecera" as const,
      nombre: "Tepakan",
      padreId: null,
    },
  ],
  nodo: { id: RAIZ, tipo: "cabecera" as const, nombre: "Tepakan" },
  calles: [
    {
      id: "22222222-2222-4222-8222-222222222222" as CalleId,
      nombre: "Calle 20",
      lugarId: RAIZ,
      punto: null,
    },
  ],
  lugares: [{ id: RAIZ, nombre: "Tepakan", tipo: "cabecera" as const }],
  vista: "domicilios" as const,
  accion: undefined,
  calleId: undefined,
  domicilioId: undefined,
  domicilio: undefined,
  permisos,
  domicilioAbierto,
});

const htmlDe = (permisos: PermisosDeTerritorio, domicilioAbierto: boolean) =>
  renderToStaticMarkup(<VistaDeLugar {...props(permisos, domicilioAbierto)} />);

describe("La vista de lugar", () => {
  it("vuelve a Domicilios si una colonia pide la vista Lugares", () => {
    const base = props(permisosDeTerritorio("OPERADOR"), false);
    const html = renderToStaticMarkup(
      <VistaDeLugar
        {...base}
        vista="lugares"
        nodo={{ ...base.nodo, tipo: "colonia" }}
      />,
    );

    expect(html).toContain('data-panel-vista="domicilios"');
    expect(html).toContain('data-contenido-vista="domicilios"');
    expect(html).not.toContain("Una colonia es el último nivel");
  });

  it("vuelve a Domicilios si una colonia pide la vista Calles", () => {
    const base = props(permisosDeTerritorio("OPERADOR"), false);
    const html = renderToStaticMarkup(
      <VistaDeLugar
        {...base}
        vista="calles"
        nodo={{ ...base.nodo, tipo: "colonia" }}
      />,
    );

    expect(html).toContain('data-panel-vista="domicilios"');
    expect(html).toContain('data-contenido-vista="domicilios"');
  });
});

describe("El alta de domicilio en el contexto del lugar", () => {
  it("se ofrece por el permiso de domicilio, no por la pestana Editar", () => {
    // El alta depende del permiso de domicilio, no del booleano de la
    // pestana Editar: con `abreLaEdicion: false` el enlace igual tiene que
    // estar.
    const permisos = {
      ...permisosDeTerritorio("OPERADOR"),
      abreLaEdicion: false,
    };

    expect(htmlDe(permisos, false)).toContain("Registrar domicilio");
  });

  it("con la accion abierta sirve el formulario dentro del lugar", () => {
    const html = htmlDe(permisosDeTerritorio("OPERADOR"), true);

    expect(html).toContain('name="calleId"');
    expect(html).toContain(`name="raiz" value="${RAIZ}"`);
  });

  it("declares the settlement destination before the fields when colonias exist", () => {
    const base = props(permisosDeTerritorio("OPERADOR"), true);
    const declaracion =
      "Se guarda en el asentamiento solo si indica «Sin colonia»; de lo contrario, elija una colonia. Las calles son de su catálogo.";
    const html = renderToStaticMarkup(
      <VistaDeLugar
        {...base}
        nodos={[
          ...base.nodos,
          ...["Centro", "San Juan", "Santa Cruz"].map((nombre, indice) => ({
            clase: "lugar" as const,
            id: `${indice + 3}3333333-3333-4333-8333-333333333333` as LugarId,
            tipo: "colonia" as const,
            nombre,
            padreId: RAIZ,
          })),
        ]}
      />,
    );

    expect(html).toContain(declaracion);
    expect(html).toContain("Elija una colonia o indique que no tiene");
    expect(html).toContain('value="sin-colonia"');
    expect(html).toContain(
      "Sin colonia (la dirección no pertenece a una colonia)",
    );
    expect(html.indexOf(declaracion)).toBeLessThan(
      html.indexOf('name="calleId"'),
    );
  });

  it("declares the selected colonia and its settlement-owned catalog", () => {
    const base = props(permisosDeTerritorio("OPERADOR"), true);
    const coloniaId = "33333333-3333-4333-8333-333333333333" as LugarId;
    const declaracion =
      "Se guarda en Colonia Centro. Las calles son del catálogo de Tepakan.";
    const html = renderToStaticMarkup(
      <VistaDeLugar
        {...base}
        nodos={[
          ...base.nodos,
          {
            clase: "lugar",
            id: coloniaId,
            tipo: "colonia",
            nombre: "Centro",
            padreId: RAIZ,
          },
        ]}
        nodo={{ id: coloniaId, tipo: "colonia", nombre: "Centro" }}
      />,
    );

    expect(html).toContain(declaracion);
    expect(html.indexOf(declaracion)).toBeLessThan(
      html.indexOf('name="calleId"'),
    );
  });

  it("el rol de solo lectura no ve el enlace ni el formulario", () => {
    const permisos = permisosDeTerritorio("CONSULTA");

    expect(htmlDe(permisos, false)).not.toContain("Registrar domicilio");
    expect(htmlDe(permisos, true)).not.toContain('name="calleId"');
  });
});
