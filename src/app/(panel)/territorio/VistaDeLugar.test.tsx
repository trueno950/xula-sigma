import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CalleId, LugarId } from "@/modules/territorio";
import {
  type PermisosDeTerritorio,
  permisosDeTerritorio,
} from "@/modules/territorio/ui/permisos";

// Los stubs de nodo y contenido: el motivo esta en `page.test.tsx`.
vi.mock("@/modules/territorio", () => ({
  PanelDeNodo: ({ children }: { children: ReactNode }) => children,
  ContenidoDeLugar: ({ children }: { children: ReactNode }) => children,
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

  it("el rol de solo lectura no ve el enlace ni el formulario", () => {
    const permisos = permisosDeTerritorio("CONSULTA");

    expect(htmlDe(permisos, false)).not.toContain("Registrar domicilio");
    expect(htmlDe(permisos, true)).not.toContain('name="calleId"');
  });
});
