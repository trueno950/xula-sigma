import { describe, expect, it } from "vitest";
import { cajaDePuntos } from "../domain";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";
import { seleccionarPin } from "./mapaLeaflet";
import { elementosDe, montarMapa } from "./mapaLeafletDePrueba";

/**
 * S5: la fila y su marcador estan ligados por el numero de orden y por un
 * atributo que el E2E puede leer. El pin elegido se marca con `data-elegida` y
 * abre su ventana; los demas la cierran. Un test no puede afirmar un contorno,
 * pero si un atributo.
 */
const PIN = marcadorDe([HECHO_DE_REPORTE], { clave: "calle-1", orden: 1 });
const OTRO = marcadorDe([HECHO_DE_INTERVENCION], {
  clave: "calle-2",
  orden: 2,
  punto: { latitud: 21, longitud: -89.5 },
});

const preparar = () => montarMapa({ marcadores: [PIN, OTRO] });

describe("prepararMapaOperativo: la fila y su marcador (S5)", () => {
  it("guarda cada pin por la clave de su calle", () => {
    const { preparado } = preparar();

    expect([...preparado.pines.keys()]).toEqual(["calle-1", "calle-2"]);
  });

  it("cada pin lleva el numero de orden que su fila muestra", () => {
    const { leaflet } = preparar();

    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('data-orden="1"'),
      }),
    );
    expect(leaflet.divIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('data-orden="2"'),
      }),
    );
  });

  it("elegir un marcador avisa a la lista con la clave de su calle", () => {
    const { pines, onSeleccion } = preparar();

    pines[1]?.disparar("click");

    expect(onSeleccion).toHaveBeenCalledWith("calle-2");
  });
});

describe("seleccionarPin", () => {
  it("marca el pin de la calle elegida y abre su ventana", () => {
    const montaje = preparar();
    const [primero, segundo] = elementosDe(montaje);

    seleccionarPin(montaje.preparado.pines, "calle-2");

    expect(segundo?.dataset.elegida).toBe("1");
    expect(primero?.dataset.elegida).toBeUndefined();
    expect(montaje.pines[1]?.openPopup).toHaveBeenCalled();
    expect(montaje.pines[0]?.closePopup).toHaveBeenCalled();
  });

  it("soltar la seleccion limpia la marca y cierra la ventana", () => {
    const montaje = preparar();
    const [, segundo] = elementosDe(montaje);

    seleccionarPin(montaje.preparado.pines, "calle-2");
    seleccionarPin(montaje.preparado.pines, null);

    expect(segundo?.dataset.elegida).toBeUndefined();
    expect(montaje.pines[1]?.closePopup).toHaveBeenCalled();
  });
});

describe("prepararMapaOperativo: la caja de dos calles", () => {
  it("encuadra los dos puntos cuando ambos tienen calle", () => {
    const caja = cajaDePuntos([PIN.punto, OTRO.punto]);
    const { mapa } = montarMapa({ marcadores: [PIN, OTRO], caja });

    expect(mapa.fitBounds).toHaveBeenCalled();
  });
});
