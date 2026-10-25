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
