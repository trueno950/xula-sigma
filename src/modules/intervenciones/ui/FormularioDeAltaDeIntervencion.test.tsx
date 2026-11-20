import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormularioDeAltaDeIntervencion } from "./FormularioDeAltaDeIntervencion";

const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";

const props = {
  tipos: [
    { valor: "BACHE", etiqueta: "Bache" },
    { valor: "PAVIMENTACION", etiqueta: "Pavimentación" },
  ],
  lugares: [{ valor: LUGAR, etiqueta: "Centro (colonia)" }],
  calles: {
    asentamientoDeLugar: { [LUGAR]: LUGAR },
    grupos: [
      {
        asentamientoId: LUGAR,
        asentamiento: "Motul",
        opciones: [{ valor: CALLE, etiqueta: "Calle 20" }],
      },
    ],
  },
  fechaDeHoy: "2026-11-16",
};

describe("FormularioDeAltaDeIntervencion", () => {
  it("pide tipo, lugar, calle opcional, fecha de ocurrencia y descripcion", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeIntervencion {...props} />,
    );

    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="lugarId"');
    expect(html).toContain("Calle (opcional)");
    expect(html).toContain('name="fechaDeOcurrencia"');
    expect(html).toContain('value="2026-11-16"');
    expect(html).toContain('type="date"');
    expect(html).toContain('name="descripcion"');
    expect(html).toContain(">Pavimentación</option>");
    expect(html).toContain(">Centro (colonia)</option>");
    expect(html).toContain(">Calle 20</option>");
    expect(html).toContain("Registrar intervención");
  });

  it("no acepta un ayuntamiento desde el formulario", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeIntervencion {...props} />,
    );

    expect(html).not.toContain("ayuntamientoId");
  });

  it("avisa que la descripcion no lleva datos de vecinos y acota su largo", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeIntervencion {...props} />,
    );

    expect(html).toContain("No anote nombres, teléfonos ni datos de vecinos.");
    expect(html).toContain('minLength="10"');
    expect(html).toContain('maxLength="1000"');
  });

  it("pinta el error del borde arriba del formulario", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeIntervencion
        {...props}
        error="Revise los datos de la intervención."
      />,
    );

    expect(html).toContain("Revise los datos de la intervención.");
  });

  /**
   * S6 de `intervenciones-ux`: sin JavaScript la lista no se acorta, y lo que
   * deja elegir con coherencia es el `<optgroup>` del asentamiento que tiene
   * cada calle.
   */
  it("con JavaScript desactivado ofrece las calles agrupadas por asentamiento", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeIntervencion {...props} />,
    );

    expect(html).toContain('<optgroup label="Motul">');
    expect(html).toContain(">Calle 20</option>");
    expect(html).toContain(">Sin calle</option>");
  });
});
