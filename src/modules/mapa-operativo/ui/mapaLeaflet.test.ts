import { describe, expect, it } from "vitest";
import { cajaDePuntos } from "../domain";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";
import { LIMITES_DE_YUCATAN } from "./mapaLeaflet";
import { MARCADOR, montarMapa } from "./mapaLeafletDePrueba";

const GRUPO = marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION], {
  orden: 1,
});

const limitesDe = (caja: NonNullable<ReturnType<typeof cajaDePuntos>>) => [
  [caja.sur, caja.oeste],
  [caja.norte, caja.este],
];

describe("prepararMapaOperativo: vista bloqueada al territorio", () => {
  it("bloquea el arrastre y el zoom a la caja de las calles del territorio", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const { leaflet, mapa } = montarMapa({ caja });

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
    const { leaflet, mapa } = montarMapa({
      marcadores: [],
      caja: null,
      zoom: 8,
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
    const { mapa } = montarMapa({ caja, zoom: 18 });

    expect(mapa.setMinZoom).toHaveBeenCalledWith(15);
    expect(mapa.fitBounds).toHaveBeenCalledWith(
      limitesDe(caja),
      expect.objectContaining({ maxZoom: 15 }),
    );
  });

  it("deja en el contenedor la vista acotada para poder verificarla desde la pagina", () => {
    const caja = cajaDePuntos([MARCADOR.punto]);
    if (!caja) throw new Error("La caja de un punto no puede ser nula.");
    const { elemento } = montarMapa({ caja });

    expect(elemento.dataset.minZoom).toBe("13");
    expect(elemento.dataset.zoom).toBe("13");
    expect(elemento.dataset.limites).toBe(
      `${caja.sur},${caja.oeste},${caja.norte},${caja.este}`,
    );
  });
});

describe("prepararMapaOperativo: iconos, colores y agrupacion", () => {
  it("dibuja cada marcador como divIcon con el color que decidio el servidor", () => {
    const { leaflet } = montarMapa();

    expect(leaflet.marker).toHaveBeenCalledTimes(1);
    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`background:${HECHO_DE_REPORTE.color}`),
      }),
    );
  });

  it("el pin del grupo lleva el numero de su fila, no el conteo de hechos", () => {
    const { leaflet } = montarMapa({ marcadores: [GRUPO] });

    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('data-orden="1"'),
      }),
    );
    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("data-hechos"),
      }),
    );
  });

  it("la ventana del grupo dice cuantos hechos lleva la calle", () => {
    const { pines } = montarMapa({ marcadores: [GRUPO] });

    expect(pines[0]?.bindPopup).toHaveBeenCalledWith(
      expect.stringContaining("2 hechos en esta calle"),
    );
    expect(pines[0]?.bindPopup).toHaveBeenCalledWith(
      expect.stringContaining("Planificada"),
    );
  });

  it("el marcador se planta en el punto de la calle, no en uno inventado", () => {
    const { leaflet } = montarMapa();

    expect(leaflet.marker).toHaveBeenCalledWith(
      [MARCADOR.punto.latitud, MARCADOR.punto.longitud],
      expect.objectContaining({ title: "REP-1" }),
    );
  });
});
