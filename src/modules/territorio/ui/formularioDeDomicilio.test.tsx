import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const sectorId = comoLugarId("33333333-3333-4333-8333-333333333333");
const manzanaId = comoLugarId("44444444-4444-4444-8444-444444444444");

const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Pablo",
    padreId: cabeceraId,
  },
  {
    clase: "lugar",
    id: sectorId,
    tipo: "sector",
    nombre: "2",
    padreId: coloniaId,
  },
  {
    clase: "lugar",
    id: manzanaId,
    tipo: "manzana",
    nombre: "San Pedro",
    padreId: sectorId,
  },
];

const base: PropsDeContenido = {
  raizId: cabeceraId,
  lugar: { id: cabeceraId, tipo: "cabecera", nombre: "Tepakan" },
  nodos,
  calles: [
    {
      id: comoCalleId("55555555-5555-4555-8555-555555555555"),
      nombre: "Calle 21",
      lugarId: cabeceraId,
      punto: null,
    },
  ],
  lugares: [{ id: cabeceraId, nombre: "Tepakan", tipo: "cabecera" }],
  domicilios: [],
  calleId: undefined,
  accion: "domicilio",
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

const renderDomicilios = (lugar: PropsDeContenido["lugar"]) =>
  renderToStaticMarkup(<TabDeDomicilios {...base} lugar={lugar} />);

describe("FormularioDeDomicilio: orden de campos y zona", () => {
  it("pone Calle antes de la zona y la zona dentro de un details", () => {
    const html = renderDomicilios(base.lugar);

    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf('name="zonaId"'),
    );

    const detalles = html.slice(
      html.indexOf("<details"),
      html.indexOf("</details>"),
    );
    expect(detalles).toContain('name="zonaId"');
    expect(detalles).toContain(
      "Sin elegir zona, se guarda en el asentamiento de la calle.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain("Zona (opcional)");
  });

  it("en el asentamiento abre sin zona y lista el catalogo de calles", () => {
    const html = renderDomicilios(base.lugar);

    expect(html).toContain("Sin zona: Tepakan");
    expect(html).toContain("Calle 21");
  });

  it("en una manzana prefija el nodo y el resumen nombra la cadena", () => {
    const html = renderDomicilios({
      id: manzanaId,
      tipo: "manzana",
      nombre: "San Pedro",
    });

    expect(html).toContain(
      "Sin cambiar la zona, se guarda en Manzana San Pedro · Sector 2 · Colonia Pablo · Tepakan.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain(`value="${manzanaId}" selected=""`);
    expect(html).toContain("San Pedro — Tepakan › Pablo › 2");
  });
});
