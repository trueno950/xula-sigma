import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoCalleId, comoLugarId, type TipoDeLugar } from "../domain";
import type { PropsDeContenido } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./FormularioDeAltaDeCalle", () => ({
  FormularioDeAltaDeCalle: () => <form data-formulario="alta-calle" />,
}));
vi.mock("./PanelDeCalle", () => ({
  PanelDeCalle: () => null,
}));

const { TabDeCalles } = await import("./TabDeCalles");

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodoId = comoLugarId("22222222-2222-4222-8222-222222222222");
const calle = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle del asentamiento",
  lugarId: raizId,
  punto: null,
};
const base: PropsDeContenido = {
  raizId,
  lugar: { id: nodoId, tipo: "cabecera", nombre: "Motul" },
  nodos: [],
  calles: [],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

const renderTab = ({
  accion,
  rol = "ADMIN_MUNICIPAL",
  tipo = "cabecera",
  resto = {},
}: {
  accion: AccionDeNodo | undefined;
  rol?: "ADMIN_MUNICIPAL" | "OPERADOR";
  tipo?: TipoDeLugar;
  resto?: Partial<PropsDeContenido>;
}) =>
  renderToStaticMarkup(
    <TabDeCalles
      {...base}
      {...resto}
      lugar={{ ...base.lugar, tipo }}
      accion={accion}
      permisos={permisosDeTerritorio(rol)}
    />,
  );

describe("Territorio streets empty state", () => {
  it("has one creation CTA while the form is closed", () => {
    const html = renderTab({ accion: undefined });

    expect(html.match(/Agregar calle/g) ?? []).toHaveLength(1);
  });

  it("does not repeat the creation CTA while the form is open", () => {
    const html = renderTab({ accion: "calle" });

    expect(html.match(/Agregar calle/g) ?? []).toHaveLength(0);
    expect(html).toContain("Agregar una calle en Motul");
    expect(html).toContain('data-formulario="alta-calle"');
  });

  it("explains why an operator cannot add a street", () => {
    const html = renderTab({ accion: undefined, rol: "OPERADOR" });

    expect(html).toContain(
      "Su rol no permite administrar la estructura territorial.",
    );
    expect(html).toContain("Se requiere el rol de administrador municipal.");
    expect(html).not.toContain("Agregar calle");
    expect(html).not.toContain("<a");
  });

  for (const tipo of ["cabecera", "comisaria"] as const) {
    it(`offers street creation for ${tipo}`, () => {
      const html = renderTab({ accion: undefined, tipo });

      expect(html).toContain("Agregar calle");
      expect(html).not.toContain("Administrar el catálogo");
    });
  }

  for (const tipo of ["colonia"] as const) {
    it(`no muestra el catalogo heredado en la vista de calles de ${tipo}`, () => {
      const html = renderTab({ accion: undefined, tipo });

      expect(html).not.toContain("Calle del asentamiento");
      expect(html).not.toContain("Administrar el catálogo");
      expect(html).not.toContain("aún no tiene calles");
      expect(html).not.toContain("Agregar calle");
      expect(html).toBe("");
    });
  }

  it("no lista calles ajenas desde la vista de calles de una colonia", () => {
    const html = renderTab({
      accion: undefined,
      tipo: "colonia",
      resto: {
        calles: [calle],
        lugares: [{ id: raizId, nombre: "Tepakan", tipo: "cabecera" }],
      },
    });

    expect(html).not.toContain("Calle del asentamiento");
    expect(html).not.toContain(calle.id);
    expect(html).not.toContain("Tepakan");
  });
});
