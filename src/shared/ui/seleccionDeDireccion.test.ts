import { describe, expect, it } from "vitest";
import {
  cambiarConsultaDeDireccion,
  crearEstadoInicialDeDireccion,
  limpiarSeleccionDeDireccion,
  mensajeDeValidezDeDireccion,
  seleccionarDireccion,
} from "./seleccionDeDireccion";

type Direccion = { id: string; etiqueta: string };

const domicilio: Direccion = {
  id: "11111111-1111-4111-8111-111111111111",
  etiqueta: "Calle 20 #42-B, Centro, Buenavista",
};

describe("seleccionDeDireccion", () => {
  it("limpia el identificador seleccionado al cambiar la consulta", () => {
    const seleccionado = seleccionarDireccion(
      crearEstadoInicialDeDireccion<Direccion>(),
      domicilio,
    );

    const cambiado = cambiarConsultaDeDireccion(seleccionado, "Calle nueva");

    expect(cambiado).toEqual({ consulta: "Calle nueva", seleccionada: null });
  });

  it("restablece consulta y seleccion al limpiar el campo", () => {
    const estado = cambiarConsultaDeDireccion(
      seleccionarDireccion(
        crearEstadoInicialDeDireccion<Direccion>(),
        domicilio,
      ),
      "Calle 20",
    );

    expect(limpiarSeleccionDeDireccion(estado)).toEqual({
      consulta: "",
      seleccionada: null,
    });
  });
});

describe("mensajeDeValidezDeDireccion", () => {
  const vacio = crearEstadoInicialDeDireccion<Direccion>();

  it("un selector requerido sin direccion elegida no deja enviar, aunque haya consulta", () => {
    expect(mensajeDeValidezDeDireccion(vacio, true)).toBe(
      "Elija una dirección de la lista.",
    );
    expect(
      mensajeDeValidezDeDireccion(
        cambiarConsultaDeDireccion(vacio, "Calle 20"),
        true,
      ),
    ).toBe("Elija una dirección de la lista.");
  });

  it("con una direccion elegida el selector requerido es valido", () => {
    expect(
      mensajeDeValidezDeDireccion(seleccionarDireccion(vacio, domicilio), true),
    ).toBe("");
  });

  it("un selector opcional deja enviar sin direccion, como en reportes", () => {
    expect(mensajeDeValidezDeDireccion(vacio, false)).toBe("");
  });
});
