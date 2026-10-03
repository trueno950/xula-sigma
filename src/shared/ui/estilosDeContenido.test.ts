import { describe, expect, it } from "vitest";
import {
  CLASES_DE_ERROR_DE_CAMPO,
  CLASES_DE_TARJETA,
  descripcionDeCampo,
  plantillaDeColumnas,
  presentacionDeAviso,
} from "./estilos";

describe("CLASES_DE_TARJETA", () => {
  it("apoya el lienzo con borde y sombra de reposo, 12px y 20px de relleno", () => {
    // DESIGN.md, Tarjetas: tono, borde y sombra, en ese orden de importancia.
    expect(CLASES_DE_TARJETA).toContain("bg-caliza-lienzo");
    expect(CLASES_DE_TARJETA).toContain("border-caliza-divisor");
    expect(CLASES_DE_TARJETA).toContain("shadow-reposo");
    expect(CLASES_DE_TARJETA).toContain("rounded-lg");
    expect(CLASES_DE_TARJETA).toContain("p-5");
  });
});

describe("CLASES_DE_ERROR_DE_CAMPO", () => {
  it("lleva fondo suave de la senal de error, no solo texto", () => {
    expect(CLASES_DE_ERROR_DE_CAMPO).toContain("bg-senial-error-suave");
    expect(CLASES_DE_ERROR_DE_CAMPO).toContain("text-senial-error");
  });
});

describe("presentacionDeAviso", () => {
  it("cada tono lleva el fondo suave de su senal", () => {
    expect(presentacionDeAviso("error").fondo).toBe("bg-senial-error-suave");
    expect(presentacionDeAviso("exito").fondo).toBe("bg-senial-exito-suave");
    expect(presentacionDeAviso("aviso").fondo).toBe("bg-senial-aviso-suave");
  });

  it("el error interrumpe al lector: role alert", () => {
    expect(presentacionDeAviso("error").role).toBe("alert");
  });

  it("el exito no interrumpe: role status", () => {
    expect(presentacionDeAviso("exito").role).toBe("status");
  });

  it("cada tono lleva su propio icono", () => {
    expect(presentacionDeAviso("error").Icono).not.toBe(
      presentacionDeAviso("exito").Icono,
    );
  });
});

describe("plantillaDeColumnas", () => {
  it("una columna sin ancho propio reparte el espacio sobrante", () => {
    expect(plantillaDeColumnas([{}])).toBe("minmax(0,1fr)");
  });

  it("respeta el ancho de cada columna, en orden", () => {
    expect(plantillaDeColumnas([{ ancho: "2fr" }, {}, { ancho: "80px" }])).toBe(
      "2fr minmax(0,1fr) 80px",
    );
  });
});

describe("descripcionDeCampo", () => {
  const ids = { idDeAyuda: "campo-ayuda", idDeError: "campo-error" };

  it("sin ayuda ni error, no describe nada", () => {
    expect(descripcionDeCampo({}, ids)).toBeUndefined();
  });

  it("con ayuda, apunta a su id", () => {
    expect(descripcionDeCampo({ ayuda: "texto" }, ids)).toBe("campo-ayuda");
  });

  it("con error, apunta a su id", () => {
    expect(descripcionDeCampo({ error: "texto" }, ids)).toBe("campo-error");
  });

  it("con los dos, apunta a los dos ids en orden", () => {
    expect(descripcionDeCampo({ ayuda: "a", error: "b" }, ids)).toBe(
      "campo-ayuda campo-error",
    );
  });
});
