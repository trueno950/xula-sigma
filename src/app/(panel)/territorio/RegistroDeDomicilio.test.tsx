import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";

const pintar = (volverA?: string) =>
  renderToStaticMarkup(
    <RegistroDeDomicilio
      calles={[]}
      declaracionDeDestino="Se guarda en el asentamiento de la calle."
      zona={{
        opciones: [],
        inicial: "",
        marcador: "Sin colonia",
        resumen: "",
        sinZonas: false,
      }}
      {...(volverA ? { volverA } : {})}
    />,
  );

describe("RegistroDeDomicilio: pie de formulario", () => {
  it.each([undefined, "/territorio?raiz=asentamiento&vista=domicilios"])(
    "agrupa Cancelar con el envio y conserva la vuelta %s",
    (volverA) => {
      const html = pintar(volverA);
      const form = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];

      expect(form).toBeDefined();
      expect(form).toContain('name="accion" value="domicilio"');
      expect(form).toContain('type="submit"');
      expect(form).toContain(
        `href="${(volverA ?? "/territorio").replaceAll("&", "&amp;")}"`,
      );
      expect(form).toContain(">Cancelar</a>");
      expect(html.match(/>Cancelar<\/a>/g)).toHaveLength(1);
    },
  );
});

describe("RegistroDeDomicilio: pedido desde la ficha de una persona", () => {
  const FICHA = "/padron/11111111-1111-4111-8111-111111111111";

  it("lleva el regreso como campo oculto y Cancelar vuelve a la ficha", () => {
    const html = renderToStaticMarkup(
      <RegistroDeDomicilio
        calles={[]}
        declaracionDeDestino="Se guarda en el asentamiento de la calle."
        zona={{
          opciones: [],
          inicial: "",
          marcador: "Sin colonia",
          resumen: "",
          sinZonas: false,
        }}
        volverA={FICHA}
        regreso={FICHA}
      />,
    );
    const form = html.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];

    expect(form).toContain(`name="regreso" value="${FICHA}"`);
    expect(form).toContain(`href="${FICHA}"`);
  });

  it("sin regreso no manda el campo", () => {
    expect(pintar()).not.toContain('name="regreso"');
  });
});
