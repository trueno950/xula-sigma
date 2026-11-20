import { describe, expect, it } from "vitest";
import {
  type CallesDelAlta,
  callesAOfrecer,
  gruposDeCalles,
} from "./FormularioDeAltaDeIntervencion.calles";

const SAN_JUAN = "11111111-1111-4111-8111-111111111111";
const BUENAVISTA = "22222222-2222-4222-8222-222222222222";
const COLONIA = "33333333-3333-4333-8333-333333333333";

const calles: CallesDelAlta = {
  asentamientoDeLugar: {
    [SAN_JUAN]: SAN_JUAN,
    [COLONIA]: SAN_JUAN,
    [BUENAVISTA]: BUENAVISTA,
  },
  grupos: [
    {
      asentamientoId: SAN_JUAN,
      asentamiento: "San Juan",
      opciones: [{ valor: "calle-22", etiqueta: "Calle 22" }],
    },
    {
      asentamientoId: BUENAVISTA,
      asentamiento: "Buenavista",
      opciones: [{ valor: "calle-23", etiqueta: "Calle 23" }],
    },
  ],
};

describe("gruposDeCalles", () => {
  it("arma un grupo por asentamiento y descarta los que no tienen calles", () => {
    const grupos = gruposDeCalles([
      { asentamientoId: SAN_JUAN, asentamiento: "San Juan", opciones: [] },
      {
        asentamientoId: BUENAVISTA,
        asentamiento: "Buenavista",
        opciones: [{ valor: "calle-23", etiqueta: "Calle 23" }],
      },
    ]);

    expect(grupos).toEqual([
      {
        asentamientoId: BUENAVISTA,
        asentamiento: "Buenavista",
        opciones: [{ valor: "calle-23", etiqueta: "Calle 23" }],
      },
    ]);
  });
});

/**
 * S6 de `intervenciones-ux`: la calle depende del lugar. Con un lugar elegido
 * solo se ofrecen las calles de su asentamiento; sin lugar, todas agrupadas,
 * que es lo que el formulario puede mostrar sin JavaScript.
 */
describe("callesAOfrecer", () => {
  it("sin lugar elegido ofrece todas, agrupadas por asentamiento", () => {
    expect(callesAOfrecer(calles, "")).toEqual({
      forma: "grupos",
      grupos: calles.grupos,
    });
  });

  it("con el asentamiento elegido ofrece solo sus calles", () => {
    expect(callesAOfrecer(calles, SAN_JUAN)).toEqual({
      forma: "lista",
      opciones: [{ valor: "calle-22", etiqueta: "Calle 22" }],
    });
  });

  it("una colonia ofrece las calles del asentamiento que la contiene", () => {
    expect(callesAOfrecer(calles, COLONIA)).toEqual({
      forma: "lista",
      opciones: [{ valor: "calle-22", etiqueta: "Calle 22" }],
    });
  });

  it("un lugar cuyo asentamiento no tiene calles no ofrece ninguna", () => {
    const sinCalles: CallesDelAlta = {
      asentamientoDeLugar: { [SAN_JUAN]: SAN_JUAN },
      grupos: calles.grupos.filter(
        (grupo) => grupo.asentamientoId !== SAN_JUAN,
      ),
    };

    expect(callesAOfrecer(sinCalles, SAN_JUAN)).toEqual({
      forma: "lista",
      opciones: [],
    });
  });

  it("un lugar que no resuelve a un asentamiento no ofrece ninguna calle", () => {
    expect(callesAOfrecer(calles, COLONIA.replace("3", "4"))).toEqual({
      forma: "lista",
      opciones: [],
    });
  });
});
