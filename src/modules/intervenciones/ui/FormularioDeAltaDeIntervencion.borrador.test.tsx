import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BorradorDeIntervencion } from "./borradorDeIntervencion";
import { FormularioDeAltaDeIntervencion } from "./FormularioDeAltaDeIntervencion";

const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";
const DESCRIPCION = "Bache rellenado frente al parque";

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

const borrador: BorradorDeIntervencion = {
  token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  campos: {
    tipo: "BACHE",
    lugarId: LUGAR,
    calleId: CALLE,
    fechaDeOcurrencia: "2026-03-02",
    descripcion: DESCRIPCION,
  },
};

const conBorrador = (capturado?: BorradorDeIntervencion) =>
  renderToStaticMarkup(
    <FormularioDeAltaDeIntervencion
      {...props}
      {...(capturado ? { borrador: capturado } : {})}
    />,
  );

/**
 * S8 de `intervenciones-ux`: si el servidor rechaza el alta, el formulario
 * vuelve con lo capturado y no vacío.
 */
describe("alta de intervención: vuelve con lo capturado", () => {
  it("rellena tipo, lugar, fecha y descripción con el borrador", () => {
    const html = conBorrador(borrador);

    expect(html).toContain(`value="BACHE" selected`);
    expect(html).toContain(`value="${LUGAR}" selected`);
    expect(html).toContain('value="2026-03-02"');
    expect(html).toContain(`>${DESCRIPCION}</textarea>`);
  });

  it("con lugar capturado, «Sin calle» vuelve a ser una respuesta y la calle se marca", () => {
    const html = conBorrador(borrador);

    expect(html).toContain(">Sin calle</option>");
    expect(html).toMatch(new RegExp(`value="${CALLE}" selected`));
  });

  it("sin borrador los campos salen en blanco y la fecha es la de hoy", () => {
    const html = conBorrador();

    expect(html).not.toContain(`value="BACHE" selected`);
    expect(html).not.toContain(DESCRIPCION);
    expect(html).toContain('value="2026-11-16"');
    expect(html).toContain(">Elija primero el lugar<");
  });
});
