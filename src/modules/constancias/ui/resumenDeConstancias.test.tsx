import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FiltrosDeListado } from "../application/puertos";
import { PieDeConstancias, ResumenDeConstancias } from "./ResumenDeConstancias";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const html = (
  total: number,
  {
    filtros = {},
    q,
    orden,
  }: {
    filtros?: FiltrosDeListado;
    q?: string;
    orden?: Parameters<typeof ResumenDeConstancias>[0]["orden"];
  } = {},
) =>
  renderToStaticMarkup(
    <ResumenDeConstancias
      total={total}
      filtros={filtros}
      q={q}
      orden={orden}
    />,
  );

describe("ResumenDeConstancias, cuántas y de qué (S2)", () => {
  it("nombra la búsqueda que produjo la lista", () => {
    expect(textoPlano(html(6, { q: "canul" }))).toContain(
      "6 constancias para «canul»",
    );
  });

  it("sin búsqueda dice solo cuántas constancias hay", () => {
    const resumen = textoPlano(html(6));

    expect(resumen).toContain("6 constancias");
    expect(resumen).not.toContain("para «");
  });

  it("una sola constancia se nombra en singular", () => {
    expect(textoPlano(html(1))).toContain("1 constancia");
  });

  it("sin orden pedido dice el default de la lectura", () => {
    expect(textoPlano(html(6))).toContain(
      "por fecha de emisión, de la más reciente a la más vieja",
    );
  });

  it("nombra el orden que se pidió en la URL", () => {
    expect(
      textoPlano(html(6, { orden: { campo: "folio", direccion: "asc" } })),
    ).toContain("por folio, del más viejo al más reciente");
  });
});

describe("ResumenDeConstancias, los chips de lo puesto (S2)", () => {
  it("la búsqueda tiene su chip y se quita sin tocar el estado", () => {
    const resumen = html(2, { filtros: { estado: "CANCELADA" }, q: "canul" });

    expect(resumen).toContain("Quitar filtro: canul");
    expect(resumen).toContain('href="/constancias?estado=CANCELADA"');
  });

  it("el estado tiene su propio chip y se quita sin tocar la búsqueda", () => {
    const resumen = html(2, { filtros: { estado: "CANCELADA" }, q: "canul" });

    expect(resumen).toContain("Quitar filtro: Estado: Cancelada");
    expect(resumen).toContain('href="/constancias?q=canul"');
  });

  it("quitar un chip conserva el orden pedido", () => {
    const resumen = html(2, {
      filtros: { estado: "VIGENTE" },
      orden: { campo: "folio", direccion: "asc" },
    });

    expect(resumen).toContain(
      'href="/constancias?ordenar=folio&amp;direccion=asc"',
    );
  });

  it("sin filtros ni búsqueda no hay chips", () => {
    expect(html(6)).not.toContain("Quitar filtro");
  });
});

describe("PieDeConstancias, cuánto se está viendo", () => {
  it("sin otra página dice el total", () => {
    expect(
      textoPlano(renderToStaticMarkup(<PieDeConstancias total={6} />)),
    ).toContain("Mostrando 1–6 de 6 constancias");
  });

  it("con otra página por delante no promete un total que no se contó", () => {
    const pie = textoPlano(
      renderToStaticMarkup(<PieDeConstancias total={4} hayMas />),
    );

    expect(pie).toContain("Mostrando 1–4 constancias");
    expect(pie).not.toContain(" de 4");
  });
});
