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

describe("Pestanas en movil", () => {
  const pestanas = ["Lugares", "Calles", "Domicilios", "Editar"].map(
    (etiqueta) => ({
      clave: etiqueta,
      etiqueta,
      href: `/x?${etiqueta}`,
      activa: etiqueta === "Lugares",
    }),
  );
  const html = renderToStaticMarkup(
    <Pestanas etiqueta="Contenido" pestanas={pestanas} />,
  );

  it("las pestanas se ajustan al ancho en vez de recortarse", () => {
    expect(html).toContain("flex-wrap");
    expect(html).not.toContain("overflow-x-auto");
  });

  it("conserva aria-current y el anillo de foco", () => {
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("focus-visible:outline");
  });
});

describe("Pestanas: la cuenta", () => {
  const html = renderToStaticMarkup(
    <Pestanas
      etiqueta="Contenido"
      pestanas={[
        {
          clave: "d",
          etiqueta: "Domicilios",
          href: "/x",
          activa: true,
          cuenta: 60,
        },
      ]}
    />,
  );
  const cuenta = html.match(/<span class="([^"]*)">60<\/span>/)?.[1] ?? "";

  // Una cuenta no es CURP ni folio: va en Label apagada, no en Dato (mono).
  it("va en Label apagada con cifras tabulares, no en monoespaciada", () => {
    expect(cuenta).toContain("text-[13px]");
    expect(cuenta).toContain("text-caliza-apagada");
    expect(cuenta).toContain("tabular-nums");
    expect(cuenta).not.toContain("font-mono");
  });
});
