import { describe, expect, it, vi } from "vitest";
import {
  cajaDePuntos,
  comoIdDeReporteEnMapa,
  type MarcadorDeMapa,
} from "../domain";
import { LIMITES_DE_YUCATAN, prepararMapaOperativo } from "./mapaLeaflet";

const MARCADOR: MarcadorDeMapa = {
  recurso: "REPORTE",
  id: comoIdDeReporteEnMapa("reporte-1"),
  etiqueta: "REP-1",
  href: "/reportes/detalle/reporte-1",
  punto: { latitud: 21.02, longitud: -89.6 },
};

type CapaFalsa = { on: () => CapaFalsa; addTo: () => CapaFalsa };
type MarcadorFalso = {
  bindPopup: () => MarcadorFalso;
  addTo: () => MarcadorFalso;
};

const crearMapaFalso = (zoomDeLaCaja: number) => {
  const mapa = {
    fitBounds: vi.fn(),
    setMinZoom: vi.fn(),
    getBoundsZoom: vi.fn(() => zoomDeLaCaja),
    getMinZoom: vi.fn(() => zoomDeLaCaja),
    getZoom: vi.fn(() => zoomDeLaCaja),
    on: vi.fn(),
    remove: vi.fn(),
  };
  return mapa;
};

const crearLeafletFalso = (mapa: ReturnType<typeof crearMapaFalso>) => {
  const capa = {} as CapaFalsa;
  capa.on = vi.fn(() => capa);
  capa.addTo = vi.fn(() => capa);
  const marcador = {} as MarcadorFalso;
  marcador.bindPopup = vi.fn(() => marcador);
  marcador.addTo = vi.fn(() => marcador);

  return {
    mapa,
    capa,
    marcador,
    leaflet: {
      map: vi.fn(() => mapa),
      point: vi.fn((punto: [number, number]) => punto),
      tileLayer: vi.fn(() => capa),
      circleMarker: vi.fn(() => marcador),
    } as unknown as typeof import("leaflet"),
  };
};

const elementoFalso = () => ({ dataset: {} }) as unknown as HTMLDivElement;

const limitesDe = (caja: NonNullable<ReturnType<typeof cajaDePuntos>>) => [
  [caja.sur, caja.oeste],
  [caja.norte, caja.este],
];

describe("prepararMapaOperativo: vista bloqueada al territorio", () => {
  it("bloquea el arrastre y el zoom a la caja de las calles del territorio", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const mapa = crearMapaFalso(13);
    const { leaflet } = crearLeafletFalso(mapa);

    prepararMapaOperativo({
      leaflet,
      elemento: elementoFalso(),
      marcadores: [MARCADOR],
      caja,
      onTileError: vi.fn(),
    });

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
    const mapa = crearMapaFalso(8);
    const { leaflet } = crearLeafletFalso(mapa);

    prepararMapaOperativo({
      leaflet,
      elemento: elementoFalso(),
      marcadores: [],
      caja: null,
      onTileError: vi.fn(),
    });

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
    const mapa = crearMapaFalso(18);
    const { leaflet } = crearLeafletFalso(mapa);

    prepararMapaOperativo({
      leaflet,
      elemento: elementoFalso(),
      marcadores: [MARCADOR],
      caja,
      onTileError: vi.fn(),
    });

    expect(mapa.setMinZoom).toHaveBeenCalledWith(15);
    expect(mapa.fitBounds).toHaveBeenCalledWith(
      limitesDe(caja),
      expect.objectContaining({ maxZoom: 15 }),
    );
  });

  it("deja en el contenedor la vista acotada para poder verificarla desde la pagina", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const mapa = crearMapaFalso(13);
    const { leaflet } = crearLeafletFalso(mapa);
    const elemento = elementoFalso();

    prepararMapaOperativo({
      leaflet,
      elemento,
      marcadores: [MARCADOR],
      caja,
      onTileError: vi.fn(),
    });

    expect(elemento.dataset.minZoom).toBe("13");
    expect(elemento.dataset.zoom).toBe("13");
    expect(elemento.dataset.limites).toBe(
      `${caja.sur},${caja.oeste},${caja.norte},${caja.este}`,
    );
  });

  it("un marcador que no pudo ubicarse sigue en cobertura, no se dibuja", () => {
    const mapa = crearMapaFalso(13);
    const { leaflet } = crearLeafletFalso(mapa);

    prepararMapaOperativo({
      leaflet,
      elemento: elementoFalso(),
      marcadores: [],
      caja: null,
      onTileError: vi.fn(),
    });

    expect(leaflet.circleMarker).not.toHaveBeenCalled();
  });
});
