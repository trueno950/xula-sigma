import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pestanas } from "./Pestanas";

describe("Pestanas", () => {
  it("usa la etiqueta accesible propia cuando la trae", () => {
    const html = renderToStaticMarkup(
      <Pestanas
        etiqueta="Contenido del lugar"
        pestanas={[
          {
            clave: "calles",
            etiqueta: "Calles",
            cuenta: 3,
            href: "/territorio?raiz=a&nodo=b&vista=calles",
            activa: true,
            etiquetaAccesible: "Calles (catalogo del asentamiento): 3",
          },
        ]}
      />,
    );

    expect(html).toContain(
      'aria-label="Calles (catalogo del asentamiento): 3"',
    );
  });
});
