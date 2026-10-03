import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InsigniaDeReporte } from "./InsigniaDeReporte";

const CASOS = [
  ["RECIBIDO", "Recibido", "bg-caliza-relleno"],
  ["EN_ATENCION", "En atención", "bg-senial-aviso-suave"],
  ["RESUELTO", "Resuelto", "bg-senial-exito-suave"],
  ["RECHAZADO", "Rechazado", "bg-senial-error-suave"],
] as const;

describe("InsigniaDeReporte", () => {
  it.each(CASOS)(
    "%s se pinta con icono, palabra y su tono",
    (estado, palabra, clase) => {
      const html = renderToStaticMarkup(<InsigniaDeReporte estado={estado} />);

      expect(html).toContain("<svg");
      expect(html).toContain(`${palabra}</span>`);
      expect(html).toContain(clase);
    },
  );
});
