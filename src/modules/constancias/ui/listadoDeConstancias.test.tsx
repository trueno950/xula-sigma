import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConstanciaGuardada } from "../application/puertos";
import { ListadoDeConstancias } from "./ListadoDeConstancias";

const textoPlano = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const constancia = (
  parcial: Partial<ConstanciaGuardada> = {},
): ConstanciaGuardada =>
  ({
    id: "11111111-1111-4111-8111-111111111111",
    folio: "VEC-2026-000018",
    emitidaEn: new Date("2026-10-24T18:00:00Z"),
    canceladaEn: null,
    nombreDelTitular: "Canul Dzul, Wilberth Antonio",
    estado: "VIGENTE",
    ...parcial,
  }) as ConstanciaGuardada;

const EMISION = <a href="/constancias/emitir">Emitir constancia</a>;

type Props = Parameters<typeof ListadoDeConstancias>[0];

const html = (props: Partial<Props> = {}) =>
  renderToStaticMarkup(
    <ListadoDeConstancias
      constancias={[constancia()]}
      hayMas={false}
      filtros={{}}
      accionDeEmision={EMISION}
      {...props}
    />,
  );

describe("ListadoDeConstancias, el titular de cada fila (S1)", () => {
  it("cada fila dice a quién se le emitió, no solo el folio", () => {
    const listado = textoPlano(html());

    expect(listado).toContain("Canul Dzul, Wilberth Antonio");
    expect(listado).toContain("VEC-2026-000018");
  });

  it("el titular tiene su propia columna en la tabla", () => {
    expect(html()).toContain(">Titular<");
  });
});

describe("ListadoDeConstancias, el conteo y el pie (S2)", () => {
  it("la línea de resultado nombra la búsqueda y el orden", () => {
    const listado = textoPlano(html({ q: "canul" }));

    expect(listado).toContain("1 constancia para «canul»");
    expect(listado).toContain("por fecha de emisión");
  });

  it("sin otra página, el pie dice cuánto se está viendo del total", () => {
    expect(textoPlano(html())).toContain("Mostrando 1–1 de 1 constancia");
  });

  it("con otra página por delante ofrece seguir en vez de prometer el total", () => {
    const listado = html({ hayMas: true });

    expect(textoPlano(listado)).toContain("Mostrando 1–1 constancia");
    expect(listado).toContain('href="/constancias?limite=100"');
  });

  it("la búsqueda conserva su chip para quitarla", () => {
    expect(html({ q: "canul" })).toContain("Quitar filtro: canul");
  });
});

describe("ListadoDeConstancias, los dos vacíos (S2)", () => {
  it("sin constancias emitidas dice qué es la pantalla y ofrece emitir", () => {
    const listado = html({ constancias: [] });

    expect(textoPlano(listado)).toContain(
      "Todavía no hay constancias emitidas.",
    );
    expect(listado).toContain('href="/constancias/emitir"');
    expect(listado).not.toContain("Sin resultados para");
  });

  it("una búsqueda sin resultados la nombra y ofrece quitarla", () => {
    const listado = html({ constancias: [], q: "yáñez" });

    expect(textoPlano(listado)).toContain('búsqueda "yáñez"');
    expect(listado).toContain(">Quitar búsqueda<");
    expect(listado).toContain('href="/constancias"');
    expect(textoPlano(listado)).not.toContain(
      "Todavía no hay constancias emitidas.",
    );
  });

  it("un vacío por estado ofrece quitar el filtro, no la búsqueda que no hubo", () => {
    const listado = html({ constancias: [], filtros: { estado: "CANCELADA" } });

    expect(listado).toContain(">Quitar el filtro<");
    expect(listado).not.toContain(">Quitar búsqueda<");
  });
});

describe("ListadoDeConstancias, el estado de cada fila", () => {
  it("una constancia vigente lleva insignia de exito con icono y palabra", () => {
    expect(html()).toMatch(
      /bg-senial-exito-suave[^>]*><svg[^>]*>.*<\/svg>Vigente</,
    );
  });

  it("una constancia cancelada lleva insignia de error con icono y palabra", () => {
    expect(
      html({
        constancias: [
          constancia({
            canceladaEn: new Date("2026-10-26T18:00:00Z"),
            estado: "CANCELADA",
          }),
        ],
      }),
    ).toMatch(/bg-senial-error-suave[^>]*><svg[^>]*>.*<\/svg>Cancelada</);
  });
});
