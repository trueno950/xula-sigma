import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste } from "./contraste";
import { PALETA } from "./paleta";
import { textoSobre } from "./textoAutomatico";
import { validarMarca } from "./validacion";

describe("PALETA", () => {
  it("ofrece alrededor de ocho colores sugeridos", () => {
    expect(PALETA.length).toBeGreaterThanOrEqual(6);
    expect(PALETA.length).toBeLessThanOrEqual(10);
  });

  it("cada color alcanza el piso de contraste con su texto automatico", () => {
    // La paleta se ofrece de un clic, sin reja de contraste a la vista: si
    // un color de aca no pasara `validarMarca`, elegirlo daria un error que
    // la operadora no puede resolver, porque el formulario no ofrece el
    // texto. Esta es la unica razon por la que la paleta existe.
    for (const { nombre, valor } of PALETA) {
      const texto = textoSobre(valor);

      expect(texto, `"${nombre}" no se puede medir`).not.toBeNull();
      expect(
        contraste(valor, texto ?? ""),
        `"${nombre}" no alcanza ${CONTRASTE_MINIMO}`,
      ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
    }
  });

  it("cada color de la paleta se puede escribir tal cual en la marca", () => {
    for (const { nombre, valor } of PALETA) {
      const veredicto = validarMarca({
        primario: valor,
        primarioTexto: textoSobre(valor),
      });

      expect(veredicto.ok, `"${nombre}" no pasa validarMarca`).toBe(true);
    }
  });

  it("no repite un color ni un nombre", () => {
    const valores = PALETA.map(({ valor }) => valor);
    const nombres = PALETA.map(({ nombre }) => nombre);

    expect(new Set(valores).size).toBe(valores.length);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("incluye al menos un color que pida texto negro", () => {
    // Sin uno, el camino automatico del texto nunca se ejercitaria desde la
    // pantalla y S2 quedaria probado solo por unidad.
    expect(PALETA.some(({ valor }) => textoSobre(valor) === "#000000")).toBe(
      true,
    );
  });
});
