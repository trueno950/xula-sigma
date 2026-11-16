import { describe, expect, it } from "vitest";
import {
  COLOR_DE_ESTADO_DESCONOCIDO,
  comoIdDeReporteEnMapa,
  type MarcadorDeMapa,
} from "../domain";
import { htmlDeLaVentana, htmlDeMarcador } from "./htmlDeMarcador";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";

describe("htmlDeMarcador", () => {
  it("el pin lleva el color que decidio el servidor, no una paleta del cliente", () => {
    expect(htmlDeMarcador(marcadorDe([HECHO_DE_REPORTE]))).toContain(
      `background:${HECHO_DE_REPORTE.color}`,
    );
  });

  it("el pin lleva el icono svg de su tipo adentro", () => {
    const html = htmlDeMarcador(marcadorDe([HECHO_DE_REPORTE]));

    expect(html).toContain("<svg");
    expect(html).toContain("<path");
  });

  it("un hecho solo no lleva contador", () => {
    const html = htmlDeMarcador(marcadorDe([HECHO_DE_REPORTE]));

    expect(html).not.toContain("data-hechos");
  });

  it("varios hechos sobre la misma calle comparten pin con su contador", () => {
    const marcador = marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION]);

    const html = htmlDeMarcador(marcador);

    expect(html).toContain('data-hechos="2"');
    expect(html).toContain(">2<");
  });
});

describe("htmlDeMarcador, la senal de atraso de S1", () => {
  it("un pin con un reporte atrasado se marca, y uno sin atraso no", () => {
    const atrasado = marcadorDe([HECHO_DE_REPORTE], {
      hechos: [{ ...HECHO_DE_REPORTE, diasDeAtraso: 10 }],
    });

    expect(htmlDeMarcador(atrasado)).toContain('data-atrasado="1"');
    expect(htmlDeMarcador(marcadorDe([HECHO_DE_REPORTE]))).not.toContain(
      "data-atrasado",
    );
  });

  it("un pin agrupado se marca si cualquiera de sus hechos esta atrasado", () => {
    const marcador = marcadorDe([], {
      hechos: [
        { ...HECHO_DE_REPORTE, diasDeAtraso: null },
        { ...HECHO_DE_INTERVENCION, diasDeAtraso: null },
        {
          ...HECHO_DE_REPORTE,
          id: comoIdDeReporteEnMapa("reporte-2"),
          diasDeAtraso: 3,
        },
      ],
    });

    expect(htmlDeMarcador(marcador)).toContain('data-atrasado="1"');
  });
});

describe("htmlDeLaVentana", () => {
  const marcador = marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION]);

  it("lista el folio, el tipo y el estado de cada hecho", () => {
    const html = htmlDeLaVentana(marcador);

    expect(html).toContain("REP-1");
    expect(html).toContain("Bache");
    expect(html).toContain("Recibido");
    expect(html).toContain("Obra");
    expect(html).toContain("Planificada");
  });

  it("enlaza cada hecho a su detalle", () => {
    const html = htmlDeLaVentana(marcador);

    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/intervenciones/intervencion-1"');
  });

  it("escapa el folio y el enlace, que vienen de la base", () => {
    const hostil: MarcadorDeMapa = marcadorDe([
      {
        ...HECHO_DE_REPORTE,
        etiqueta: 'REP <1> & "x"',
        href: '/reportes/detalle/"><script>',
      },
    ]);

    const html = htmlDeLaVentana(hostil);

    expect(html).toContain("REP &lt;1&gt; &amp; &quot;x&quot;");
    expect(html).not.toContain("<script>");
  });
});

/**
 * Sonda de XSS durable: el pin y su ventana se insertan con `innerHTML` en
 * Leaflet, asi que cualquier cadena que llegue ahi -folio, enlace, etiqueta o
 * el color del estado- podria cerrar la etiqueta y meter la suya. En vez de
 * perseguir payloads, se comprueba lo unico que importa: que del HTML armado
 * solo salgan las etiquetas que este modulo escribe.
 */
const ETIQUETAS_PERMITIDAS: ReadonlySet<string> = new Set([
  "ul",
  "li",
  "a",
  "span",
  "svg",
  "path",
  // S4: la fecha del hecho va en su propio `<time>`.
  "time",
]);

const CARGA = '"><img src=x onerror=alert(1)>';
const COLOR_CARGA = 'red"><script>alert(1)</script>';

const etiquetasDe = (html: string): readonly string[] =>
  [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map((coincidencia) =>
    (coincidencia[1] ?? "").toLowerCase(),
  );

const etiquetasAjenas = (html: string): readonly string[] =>
  etiquetasDe(html).filter((etiqueta) => !ETIQUETAS_PERMITIDAS.has(etiqueta));

const marcadorHostil = (): MarcadorDeMapa =>
  marcadorDe([
    {
      ...HECHO_DE_REPORTE,
      etiqueta: CARGA,
      href: CARGA,
      etiquetaDeTipo: CARGA,
      etiquetaDeEstado: CARGA,
      color: COLOR_CARGA,
    },
  ]);

describe("html del mapa: solo las etiquetas que el modulo escribe", () => {
  it("el pin no deja pasar ninguna etiqueta ajena", () => {
    const html = htmlDeMarcador(marcadorHostil());

    expect(etiquetasAjenas(html)).toEqual([]);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
  });

  it("la ventana no deja pasar ninguna etiqueta ajena", () => {
    const html = htmlDeLaVentana(marcadorHostil());

    expect(etiquetasAjenas(html)).toEqual([]);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
  });

  it("un color fuera de la paleta no se escribe: el pin cae al gris neutro", () => {
    const html = htmlDeMarcador(marcadorHostil());

    expect(html).toContain(`background:${COLOR_DE_ESTADO_DESCONOCIDO}`);
    expect(html).not.toContain("script");
  });
});

describe("htmlDeLaVentana, la senal de atraso de S1", () => {
  it("dice cuantos dias lleva atrasado el reporte", () => {
    const marcador = marcadorDe([], {
      hechos: [{ ...HECHO_DE_REPORTE, diasDeAtraso: 12 }],
    });

    expect(htmlDeLaVentana(marcador)).toContain("Atrasado · 12 días");
  });

  it("un reporte al dia no dice nada de atraso", () => {
    expect(htmlDeLaVentana(marcadorDe([HECHO_DE_REPORTE]))).not.toContain(
      "Atrasado",
    );
  });
});
