import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import { comoCalleId, comoLugarId, comoZonaId } from "../domain";
import { DetalleDeZona } from "./DetalleDeZona";
import { base } from "./fixturasDeDomiciliosU5";
import { ListaDeZonas } from "./ListaDeZonas";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/altaDeZonaAction", () => ({ altaDeZonaAction: vi.fn() }));
vi.mock("./actions/renombrarZonaAction", () => ({
  renombrarZonaAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaZonaAction", () => ({
  darDeBajaZonaAction: vi.fn(),
}));
vi.mock("./actions/agregarCalleAZonaAction", () => ({
  agregarCalleAZonaAction: vi.fn(),
}));
vi.mock("./actions/quitarCalleDeZonaAction", () => ({
  quitarCalleDeZonaAction: vi.fn(),
}));

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const zona: ZonaGuardada = {
  id: comoZonaId("22222222-2222-4222-8222-222222222222"),
  nombre: "Zona Norte",
  lugarId,
  asentamiento: "Motul",
};
const asentamiento: LugarGuardado = {
  id: lugarId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};
const calle20 = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 20",
};
const calle22 = {
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle 22",
};

const lista = (puedeAdministrar: boolean) =>
  renderToStaticMarkup(
    <ListaDeZonas
      zonas={[zona]}
      asentamientos={[asentamiento]}
      raizActiva={null}
      error={undefined}
      aviso={undefined}
      puedeAdministrar={puedeAdministrar}
    />,
  );

const detalle = (puedeAdministrar: boolean) =>
  renderToStaticMarkup(
    <DetalleDeZona
      zona={zona}
      vista="calles"
      calles={[calle20]}
      domicilios={[]}
      callesDelAsentamiento={[calle20, calle22]}
      error={undefined}
      aviso={undefined}
      puedeAdministrar={puedeAdministrar}
    />,
  );

describe("las zonas para un rol que no administra territorio", () => {
  it("el listado no ofrece Nueva zona", () => {
    expect(lista(false)).not.toContain("Nueva zona");
    expect(lista(false)).toContain("Zona Norte");
  });

  it("el detalle no ofrece renombrar, dar de baja, agregar ni quitar", () => {
    const html = detalle(false);

    expect(html).not.toContain("Renombrar");
    expect(html).not.toContain("Dar de baja");
    expect(html).not.toContain("Agregar a la zona");
    expect(html).not.toContain("Quitar Calle 20");
    expect(html).toContain("Calle 20");
  });

  it("quien administra territorio las sigue viendo todas", () => {
    expect(lista(true)).toContain("Nueva zona");

    const html = detalle(true);
    expect(html).toContain("Renombrar");
    expect(html).toContain("Dar de baja");
    expect(html).toContain("Agregar a la zona");
    expect(html).toContain("Quitar Calle 20");
  });
});

describe("Agregar la primera calle", () => {
  const sinCalles = (rol: "OPERADOR" | "ADMIN_MUNICIPAL") =>
    renderToStaticMarkup(
      <TabDeDomicilios
        {...base}
        calles={[]}
        domicilios={{ filas: [], hayMas: false }}
        permisos={permisosDeTerritorio(rol)}
      />,
    );

  it("no se ofrece a quien no puede crear calles", () => {
    const html = sinCalles("OPERADOR");

    expect(html).not.toContain("Agregar la primera");
    expect(html).not.toContain("accion=calle");
  });

  it("se ofrece a quien puede crearlas", () => {
    expect(sinCalles("ADMIN_MUNICIPAL")).toContain("Agregar la primera calle");
  });
});
