import { describe, expect, it, vi } from "vitest";
import { cajaDePuntos } from "../domain";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";
import { LIMITES_DE_YUCATAN, prepararMapaOperativo } from "./mapaLeaflet";

const MARCADOR = marcadorDe([HECHO_DE_REPORTE]);
const GRUPO = marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION]);

type CapaFalsa = { on: () => CapaFalsa; addTo: () => CapaFalsa };
type MarcadorFalso = {
  bindPopup: (html: string) => MarcadorFalso;
  addTo: () => MarcadorFalso;
};

const crearMapaFalso = (zoomDeLaCaja: number) => ({
  fitBounds: vi.fn(),
  setMinZoom: vi.fn(),
  getBoundsZoom: vi.fn(() => zoomDeLaCaja),
  getMinZoom: vi.fn(() => zoomDeLaCaja),
  getZoom: vi.fn(() => zoomDeLaCaja),
  on: vi.fn(),
  remove: vi.fn(),
});

const crearLeafletFalso = (mapa: ReturnType<typeof crearMapaFalso>) => {
  const capa = {} as CapaFalsa;
  capa.on = vi.fn(() => capa);
  capa.addTo = vi.fn(() => capa);
  const marcador = {} as MarcadorFalso;
  marcador.bindPopup = vi.fn(() => marcador);
  marcador.addTo = vi.fn(() => marcador);

  return {
    mapa,
    marcador,
    leaflet: {
      map: vi.fn(() => mapa),
      point: vi.fn((punto: [number, number]) => punto),
      tileLayer: vi.fn(() => capa),
      divIcon: vi.fn(() => "icono"),
      marker: vi.fn(() => marcador),
    } as unknown as typeof import("leaflet"),
  };
};

const elementoFalso = () => ({ dataset: {} }) as unknown as HTMLDivElement;

const limitesDe = (caja: NonNullable<ReturnType<typeof cajaDePuntos>>) => [
  [caja.sur, caja.oeste],
  [caja.norte, caja.este],
];

const montar = (
  datos: {
    marcadores?: readonly (typeof MARCADOR)[];
    caja?: NonNullable<ReturnType<typeof cajaDePuntos>> | null;
    zoom?: number;
  } = {},
) => {
  const mapa = crearMapaFalso(datos.zoom ?? 13);
  const falso = crearLeafletFalso(mapa);
  const elemento = elementoFalso();
  prepararMapaOperativo({
    leaflet: falso.leaflet,
    elemento,
    marcadores: datos.marcadores ?? [MARCADOR],
    caja:
      datos.caja === undefined ? cajaDePuntos([MARCADOR.punto]) : datos.caja,
    onTileError: vi.fn(),
  });
  return { ...falso, elemento };
};

describe("prepararMapaOperativo: vista bloqueada al territorio", () => {
  it("bloquea el arrastre y el zoom a la caja de las calles del territorio", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const { leaflet, mapa } = montar({ caja });

    expect(leaflet.map).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        maxBounds: limitesDe(caja),
        maxBoundsViscosity: 1,
      }),
    );
    expect(mapa.fitBounds).toHaveBeenCalledWith(
      limitesDe(caja),
      expect.objectContaining({ padding: [24, 24] }),
    );
    expect(mapa.setMinZoom).toHaveBeenCalledWith(13);
  });

  it("sin calles ubicadas vuelve a la caja de Yucatán en vez de inventar un centro", () => {
    const { leaflet, mapa } = montar({ marcadores: [], caja: null, zoom: 8 });

    expect(leaflet.map).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxBounds: LIMITES_DE_YUCATAN }),
    );
    expect(mapa.fitBounds).toHaveBeenCalledWith(
      LIMITES_DE_YUCATAN,
      expect.anything(),
    );
  });

  it("el zoom de entrada nunca queda por debajo del minimo bloqueado", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const { mapa } = montar({ caja, zoom: 18 });

    expect(mapa.setMinZoom).toHaveBeenCalledWith(15);
    expect(mapa.fitBounds).toHaveBeenCalledWith(
      limitesDe(caja),
      expect.objectContaining({ maxZoom: 15 }),
    );
  });

  it("deja en el contenedor la vista acotada para poder verificarla desde la pagina", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const { elemento } = montar({ caja });

    expect(elemento.dataset.minZoom).toBe("13");
    expect(elemento.dataset.zoom).toBe("13");
    expect(elemento.dataset.limites).toBe(
      `${caja.sur},${caja.oeste},${caja.norte},${caja.este}`,
    );
  });
});

describe("prepararMapaOperativo: iconos, colores y agrupacion", () => {
  it("dibuja cada marcador como divIcon con el color que decidio el servidor", () => {
    const { leaflet } = montar();

    expect(leaflet.marker).toHaveBeenCalledTimes(1);
    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`background:${HECHO_DE_REPORTE.color}`),
      }),
    );
  });

  it("el pin del grupo lleva su contador", () => {
    const { leaflet } = montar({ marcadores: [GRUPO] });

    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('data-hechos="2"'),
      }),
    );
  });

  it("un solo hecho no lleva contador", () => {
    const { leaflet } = montar();

    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("data-hechos"),
      }),
    );
  });

  it("la ventana del grupo lista sus hechos", () => {
    const { marcador } = montar({ marcadores: [GRUPO] });

    expect(marcador.bindPopup).toHaveBeenCalledWith(
      expect.stringContaining("REP-1"),
    );
    expect(marcador.bindPopup).toHaveBeenCalledWith(
      expect.stringContaining("Planificada"),
    );
  });

  it("el marcador se planta en el punto de la calle, no en uno inventado", () => {
    const { leaflet } = montar();

    expect(leaflet.marker).toHaveBeenCalledWith(
      [MARCADOR.punto.latitud, MARCADOR.punto.longitud],
      expect.objectContaining({ title: "REP-1" }),
    );
  });
});
