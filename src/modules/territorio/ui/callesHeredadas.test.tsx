import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoCalleId, comoLugarId, type TipoDeLugar } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";
import { TabDeLugares } from "./TabDeLugares";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodoId = comoLugarId("22222222-2222-4222-8222-222222222222");
const calle = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: raizId,
  punto: null,
};
const base: PropsDeContenido = {
  raizId,
  lugar: { id: nodoId, tipo: "colonia", nombre: "Centro" },
  nodos: [],
  calles: [calle],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

const renderDomicilios = (
  tipo: TipoDeLugar,
  resto: Partial<PropsDeContenido> = {},
) =>
  renderToStaticMarkup(
    <TabDeDomicilios
      {...base}
      {...resto}
      lugar={{ ...base.lugar, tipo }}
      accion="domicilio"
    />,
  );

describe("TabDeLugares en el ultimo nivel", () => {
  it("no menciona calles en el mensaje de una manzana sin hijos", () => {
    const html = renderToStaticMarkup(
      <TabDeLugares {...base} lugar={{ ...base.lugar, tipo: "manzana" }} />,
    );

    expect(html).toContain("no lleva lugares adentro");
    expect(html).toContain("solo domicilios");
    expect(html).not.toContain("calles");
  });
});

describe("TabDeDomicilios: alta desacoplada del nodo", () => {
  it("no ancla un alta de domicilio al nodo", () => {
    const html = renderDomicilios("colonia");

    expect(html).not.toContain("Agregar domicilio");
    expect(html).not.toContain("<form");
  });
});
