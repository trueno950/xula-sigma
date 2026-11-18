import { describe, expect, it } from "vitest";
import { leerParametrosDeFicha } from "./parametros";

describe("leerParametrosDeFicha", () => {
  it("sin `?pestana=` la ficha abre en Residencias", () => {
    expect(leerParametrosDeFicha({}).pestana).toBe("residencias");
  });

  it("la pestaña de Administrar se conserva", () => {
    expect(leerParametrosDeFicha({ pestana: "administrar" }).pestana).toBe(
      "administrar",
    );
  });

  it("una pestaña fuera de las dos validas abre Residencias sin tirar los demas parametros", () => {
    const parametros = leerParametrosDeFicha({
      pestana: "constancias",
      ok: "domicilio-creado",
      error: "No se pudieron guardar los cambios.",
    });

    expect(parametros.pestana).toBe("residencias");
    expect(parametros.ok).toBe("domicilio-creado");
    expect(parametros.error).toBe("No se pudieron guardar los cambios.");
  });

  it("un `?domicilio=` que no es uuid se ignora sin tirar la pestaña", () => {
    const parametros = leerParametrosDeFicha({
      pestana: "administrar",
      domicilio: "Calle 38 #157",
    });

    expect(parametros.pestana).toBe("administrar");
    expect(parametros.domicilio).toBeUndefined();
  });
});
