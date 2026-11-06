import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import { comoCalleId, comoLugarId, comoZonaId } from "../domain";
import { DetalleDeZona } from "./DetalleDeZona";
import { ListaDeZonas } from "./ListaDeZonas";

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

const renderLista = () =>
  renderToStaticMarkup(
    <ListaDeZonas
      zonas={[zona]}
      asentamientos={[asentamiento]}
      raizActiva={null}
      error={undefined}
      aviso={undefined}
    />,
  );

const renderDetalle = () =>
  renderToStaticMarkup(
    <DetalleDeZona
      zona={zona}
      vista="calles"
      calles={[calle20]}
      domicilios={[]}
      callesDelAsentamiento={[calle20, calle22]}
      error={undefined}
      aviso={undefined}
    />,
  );

/** El interior de cada `<a>`, para buscar lo que no puede ir adentro. */
const interioresDeEnlaces = (html: string) =>
  [...html.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, dentro]) => dentro ?? "",
  );

/** El `<details>` que contiene un texto, o undefined. */
const detalleCon = (html: string, texto: string) =>
  [...html.matchAll(/<details[\s\S]*?<\/details>/g)]
    .map(([bloque]) => bloque)
    .find((bloque) => bloque.includes(texto));

describe("el listado de zonas", () => {
  it("la fila solo navega a la zona: ni boton ni formulario dentro del enlace", () => {
    const html = renderLista();

    const fila = interioresDeEnlaces(html).find((dentro) =>
      dentro.includes("Zona Norte"),
    );
    expect(fila).toBeDefined();
    expect(fila).not.toMatch(/<button|<form/);
    expect(html).not.toContain("Dar de baja");
    expect(html).not.toContain(">Acciones<");
  });

  it("el alta va en un panel con titulo y el select del sistema", () => {
    const html = renderLista();

    expect(html).toContain("<section");
    expect(html).toMatch(/<h2[^>]*>Nueva zona<\/h2>/);
    expect(html).toMatch(/<label for="zona-asentamiento"[^>]*>Asentamiento/);
    expect(html).toContain("appearance-none");
    expect(html).toContain("Elija el asentamiento");
  });

  it("vuelve a Territorio, no al mapa", () => {
    const html = renderLista();

    expect(html).toContain("Volver a Territorio");
    expect(html).not.toContain("Volver al mapa de territorio");
  });
});

describe("el detalle de zona", () => {
  it("la baja va dentro de un <details>, destructiva y despues de renombrar", () => {
    const html = renderDetalle();

    const baja = detalleCon(html, "Dar de baja Zona Norte");
    expect(baja).toBeDefined();
    expect(baja).toContain("text-senial-error");
    expect(baja).toContain("<svg");
    expect(html.indexOf("Renombrar")).toBeLessThan(html.indexOf("Dar de baja"));
    expect(detalleCon(html, "Renombrar")).toBeDefined();
  });

  it("quitar una calle es un boton de 44px con icono que nombra la calle", () => {
    const html = renderDetalle();

    const boton = html.match(
      /<button[^>]*aria-label="Quitar Calle 20 de la zona"[^>]*>[\s\S]*?<\/button>/,
    )?.[0];
    expect(boton).toBeDefined();
    expect(boton).toContain("h-11");
    expect(boton).toContain("<svg");
    expect(boton).not.toContain("underline");
  });

  it("agregar calle usa el select del sistema con solo las calles fuera de la zona", () => {
    const html = renderDetalle();

    expect(html).toMatch(/<label for="zona-calle"[^>]*>Calle del asentamiento/);
    expect(html).toContain("appearance-none");
    expect(html).toContain(`value="${calle22.id}"`);
    expect(html).not.toContain(`<option value="${calle20.id}"`);
  });
});
