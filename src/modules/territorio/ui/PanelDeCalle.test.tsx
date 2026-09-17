import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import { PanelDeCalle } from "./PanelDeCalle";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, permisosDeTerritorio } from "./permisos";
import type { CalleParaPanel } from "./vistaDeCalles";

vi.mock("./FormularioDeUbicacion", () => ({
  FormularioDeUbicacion: () => <form data-formulario="ubicacion" />,
}));
vi.mock("./FormularioDeRenombreDeCalle", () => ({
  FormularioDeRenombreDeCalle: () => <form data-formulario="renombrar" />,
}));
vi.mock("./FormularioDeMovimientoDeCalle", () => ({
  FormularioDeMovimientoDeCalle: () => <form data-formulario="movimiento" />,
}));
vi.mock("./FormularioDeBajaDeCalle", () => ({
  FormularioDeBajaDeCalle: () => <form data-formulario="baja" />,
}));

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodoId = comoLugarId("22222222-2222-4222-8222-222222222222");
const calle: CalleParaPanel = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: nodoId,
  punto: null,
};

const renderPanel = (accion: AccionDeNodo, permisos: PermisosDeTerritorio) =>
  renderToStaticMarkup(
    <PanelDeCalle
      raizId={raizId}
      nodoId={nodoId}
      calle={calle}
      lugares={[]}
      accion={accion}
      permisos={permisos}
    />,
  );

describe("PanelDeCalle", () => {
  it("no abre un formulario ante una accion forjada para un rol sin permiso", () => {
    const html = renderPanel(
      "renombrarCalle",
      permisosDeTerritorio("OPERADOR"),
    );

    expect(html).not.toContain('data-formulario="renombrar"');
    expect(html).not.toContain("Cancelar");
    expect(html).toContain(
      "Su rol no permite administrar la estructura territorial.",
    );
    expect(html).not.toContain("<a");
  });

  it("abre el formulario pedido cuando el rol tiene permiso", () => {
    const html = renderPanel(
      "renombrarCalle",
      permisosDeTerritorio("ADMIN_MUNICIPAL"),
    );

    expect(html).toContain('data-formulario="renombrar"');
  });
});
