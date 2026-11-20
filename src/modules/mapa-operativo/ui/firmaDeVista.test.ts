import { describe, expect, it } from "vitest";
import { firmaDeVista } from "./firmaDeVista";
import { CAJA, HECHO_DE_REPORTE, marcadorDe } from "./mapaDePrueba";

const MARCADOR = marcadorDe([HECHO_DE_REPORTE]);

const COPIA_DE_LA_CAJA = CAJA === null ? null : { ...CAJA };

describe("firmaDeVista: cuando el mapa tiene que volver a dibujarse", () => {
  /**
   * `EstadoEnVivo` refresca la pantalla cada vez que el canal manda `resync`
   * o `actualizacion`, y el servidor entrega los marcadores en objetos
   * nuevos aunque el contenido sea el mismo. Si la huella mirara la
   * identidad de los objetos, cada latido desmontaria el mapa -zoom,
   * arrastre y ventana abierta perdidos, y un hueco sin controles en medio-.
   */
  it("dos dibujos equivalentes en objetos distintos comparten firma", () => {
    const primero = firmaDeVista({
      marcadores: [marcadorDe([HECHO_DE_REPORTE])],
      caja: COPIA_DE_LA_CAJA,
    });
    const segundo = firmaDeVista({
      marcadores: [{ ...MARCADOR, hechos: [...MARCADOR.hechos] }],
      caja: CAJA,
    });

    expect(primero).toBe(segundo);
  });

  it("cambia cuando se mueve la caja del territorio elegido", () => {
    expect(
      firmaDeVista({ marcadores: [MARCADOR], caja: CAJA }) ===
        firmaDeVista({
          marcadores: [MARCADOR],
          caja: { sur: 20, oeste: -90, norte: 21, este: -88 },
        }),
    ).toBe(false);
  });

  it("cambia cuando entra o sale un pin", () => {
    expect(
      firmaDeVista({ marcadores: [MARCADOR], caja: CAJA }) ===
        firmaDeVista({ marcadores: [], caja: CAJA }),
    ).toBe(false);
    expect(
      firmaDeVista({ marcadores: [MARCADOR], caja: CAJA }) ===
        firmaDeVista({
          marcadores: [
            MARCADOR,
            marcadorDe([HECHO_DE_REPORTE], { clave: "calle-2" }),
          ],
          caja: CAJA,
        }),
    ).toBe(false);
  });

  it("cambia cuando cambia el contenido del pin, aunque sea la misma calle", () => {
    const conOtraEtiqueta = marcadorDe([
      { ...HECHO_DE_REPORTE, etiqueta: "REP-2" },
    ]);

    expect(
      firmaDeVista({ marcadores: [MARCADOR], caja: CAJA }) ===
        firmaDeVista({ marcadores: [conOtraEtiqueta], caja: CAJA }),
    ).toBe(false);
  });

  it("distingue no tener caja -territorio sin calles ubicadas- de tenerla", () => {
    expect(
      firmaDeVista({ marcadores: [], caja: null }) ===
        firmaDeVista({ marcadores: [], caja: CAJA }),
    ).toBe(false);
  });
});
