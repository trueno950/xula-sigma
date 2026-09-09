import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CAJA_DE_YUCATAN } from "../domain";
import { SelectorDePunto } from "./SelectorDePunto";
import {
  configuracionDeMapa,
  mensajeDeFalloDeTiles,
  prepararMapa,
} from "./useMapaDePunto";

type MapaFalso = {
  setView: (centro: [number, number], zoom: number) => MapaFalso;
  on: (evento: string, listener: unknown) => MapaFalso;
};

type CapaFalsa = {
  on: (evento: string, listener: () => void) => CapaFalsa;
  addTo: (mapa: MapaFalso) => CapaFalsa;
};

describe("selector de punto", () => {
  it("expone la configuracion publica acotada a Yucatan y la atribucion de OSM", () => {
    const configuracion = configuracionDeMapa();

    expect(configuracion.tileUrl).toBe(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(configuracion.attribution).toContain("OpenStreetMap");
    expect(configuracion.maxBounds).toEqual([
      [CAJA_DE_YUCATAN.latitudMinima, CAJA_DE_YUCATAN.longitudMinima],
      [CAJA_DE_YUCATAN.latitudMaxima, CAJA_DE_YUCATAN.longitudMaxima],
    ]);
  });

  it("redacta el fallo de tiles sin impedir el envio nativo", () => {
    expect(mensajeDeFalloDeTiles()).toBe(
      "No se pudieron cargar los mapas. Puede guardar las coordenadas con los campos.",
    );

    const html = renderToStaticMarkup(
      <SelectorDePunto punto={{ latitud: 20.937, longitud: -89.6237 }} />,
    );

    expect(html).toContain('name="latitud"');
    expect(html).toContain('name="longitud"');
    expect(html).toContain('type="number"');
    expect(html).toContain("OpenStreetMap");
  });

  it("muestra campos de coordenadas vacios cuando no existe un punto", () => {
    const html = renderToStaticMarkup(<SelectorDePunto punto={null} />);

    expect(html).toContain(">Latitud</label>");
    expect(html).toContain(">Longitud</label>");
    expect(html).toMatch(/name="latitud"[^>]*value=""/);
    expect(html).toMatch(/name="longitud"[^>]*value=""/);
  });

  it("mantiene disponible el contenedor mientras se inicializa el mapa", () => {
    const html = renderToStaticMarkup(
      <SelectorDePunto punto={{ latitud: 20.937, longitud: -89.6237 }} />,
    );

    expect(html).not.toContain('hidden=""');
    expect(html).toContain(
      'class="h-72 w-full rounded-md border border-caliza-divisor"',
    );
    expect(html).not.toMatch(
      /<div[^>]*role="application"[^>]*class="[^"]*\b(?:visible|invisible)\b[^"]*"/,
    );
    expect(html).toContain('style="visibility:hidden"');
    expect(html).toContain('role="application"');
    expect(html).toContain(
      'aria-label="Mapa para elegir la ubicacion de la calle"',
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('name="latitud"');
    expect(html).toContain('name="longitud"');
  });

  it("avisa cuando la capa de tiles emite tileerror", () => {
    const listeners = new Map<string, () => void>();
    const mapa: MapaFalso = {
      setView: vi.fn((_centro, _zoom) => mapa),
      on: vi.fn((_evento, _listener) => mapa),
    };
    const tiles: CapaFalsa = {
      on: vi.fn((evento, listener) => {
        listeners.set(evento, listener);
        return tiles;
      }),
      addTo: vi.fn((_mapa) => tiles),
    };
    const leaflet = {
      map: vi.fn(() => mapa),
      tileLayer: vi.fn(() => tiles),
    } as unknown as typeof import("leaflet");
    const onTileError = vi.fn();

    prepararMapa({
      leaflet,
      elemento: {} as HTMLDivElement,
      punto: null,
      onSelect: vi.fn(),
      onTileError,
    });
    listeners.get("tileerror")?.();

    expect(onTileError).toHaveBeenCalledTimes(1);
  });
});
