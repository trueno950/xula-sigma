import { vi } from "vitest";
import type { CajaDeMapa, MarcadorDeMapa } from "../domain";
import { cajaDePuntos } from "../domain";
import { HECHO_DE_REPORTE, marcadorDe } from "./mapaDePrueba";
import { type MapaPreparado, prepararMapaOperativo } from "./mapaLeaflet";

/**
 * El doble de Leaflet que comparten los tests del mapa. Vive en un
 * `*DePrueba.ts` y no en cada suite por la metrica de lineas por archivo
 * (`AGENTS.md`): los dos temas -la vista acotada y la seleccion- necesitan el
 * mismo mapa falso, y copiarlo en cada uno era la unica otra salida.
 */
export type ElementoFalso = {
  dataset: Record<string, string>;
  style: Record<string, string>;
};

export type MarcadorFalso = {
  bindPopup: (html: string) => MarcadorFalso;
  addTo: () => MarcadorFalso;
  on: (evento: string, escucha: () => void) => MarcadorFalso;
  getElement: () => ElementoFalso;
  openPopup: () => MarcadorFalso;
  closePopup: () => MarcadorFalso;
  disparar: (evento: string) => void;
};

export type MapaFalso = ReturnType<typeof crearMapaFalso>;

export const MARCADOR = marcadorDe([HECHO_DE_REPORTE], {
  clave: "calle-1",
  orden: 1,
});

export const crearMapaFalso = (zoomDeLaCaja = 13) => ({
  fitBounds: vi.fn(),
  setMinZoom: vi.fn(),
  getBoundsZoom: vi.fn(() => zoomDeLaCaja),
  getMinZoom: vi.fn(() => zoomDeLaCaja),
  getZoom: vi.fn(() => zoomDeLaCaja),
  on: vi.fn(),
  remove: vi.fn(),
});

export const crearMarcadorFalso = (elemento: ElementoFalso): MarcadorFalso => {
  const escuchas: Record<string, () => void> = {};
  const marcador = {} as MarcadorFalso;
  marcador.bindPopup = vi.fn(() => marcador);
  marcador.addTo = vi.fn(() => marcador);
  marcador.on = vi.fn((evento, escucha) => {
    escuchas[evento] = escucha;
    return marcador;
  });
  marcador.getElement = () => elemento;
  marcador.openPopup = vi.fn(() => marcador);
  marcador.closePopup = vi.fn(() => marcador);
  marcador.disparar = (evento) => escuchas[evento]?.();
  return marcador;
};

type Datos = {
  marcadores?: readonly MarcadorDeMapa[];
  caja?: CajaDeMapa | null;
  zoom?: number;
  onSeleccion?: (clave: string) => void;
  onTileError?: () => void;
};

export type Montaje = {
  preparado: MapaPreparado;
  leaflet: typeof import("leaflet");
  mapa: MapaFalso;
  elemento: HTMLDivElement;
  pines: readonly MarcadorFalso[];
  onSeleccion: (clave: string) => void;
};

/** Monta el mapa con marcadores falsos y devuelve lo que cada test mira. */
export const montarMapa = (datos: Datos = {}): Montaje => {
  const mapa = crearMapaFalso(datos.zoom ?? 13);
  const capa = { on: vi.fn(), addTo: vi.fn() };
  const pines: MarcadorFalso[] = [];
  const elementos: ElementoFalso[] = [];
  const onSeleccion = datos.onSeleccion ?? vi.fn();
  const leaflet = {
    map: vi.fn(() => mapa),
    point: vi.fn((punto: [number, number]) => punto),
    tileLayer: vi.fn(() => capa),
    divIcon: vi.fn(() => "icono"),
    marker: vi.fn(() => {
      const elemento: ElementoFalso = { dataset: {}, style: {} };
      elementos.push(elemento);
      const marcador = crearMarcadorFalso(elemento);
      pines.push(marcador);
      return marcador;
    }),
  } as unknown as typeof import("leaflet");
  const marcadores = datos.marcadores ?? [MARCADOR];
  const elemento = { dataset: {} } as unknown as HTMLDivElement;

  const preparado = prepararMapaOperativo({
    leaflet,
    elemento,
    marcadores,
    caja:
      datos.caja === undefined ? cajaDePuntos([MARCADOR.punto]) : datos.caja,
    onTileError: datos.onTileError ?? vi.fn(),
    onSeleccion,
  });

  return { preparado, leaflet, mapa, elemento, pines, onSeleccion };
};

/** Los elementos del DOM falso de cada pin, en el orden en que se crearon. */
export const elementosDe = (montaje: Montaje): readonly ElementoFalso[] =>
  montaje.pines.map((pin) => pin.getElement());
