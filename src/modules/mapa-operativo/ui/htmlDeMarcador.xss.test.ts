import { describe, expect, it } from "vitest";
import { COLOR_DE_ESTADO_DESCONOCIDO, type MarcadorDeMapa } from "../domain";
import { htmlDeLaVentana, htmlDeMarcador } from "./htmlDeMarcador";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  marcadorDe,
} from "./mapaDePrueba";

/**
 * Sonda de XSS durable: el pin y su ventana se insertan con `innerHTML` en
 * Leaflet, asi que cualquier cadena que llegue ahi -folio, enlace, etiqueta,
 * fecha, dias de atraso o el color del estado- podria cerrar la etiqueta y
 * meter la suya. En vez de perseguir payloads, se comprueba lo unico que
 * importa: que del HTML armado solo salgan las etiquetas que este modulo
 * escribe.
 *
 * Vive aparte de `htmlDeMarcador.test.ts` por la metrica de lineas por
 * archivo (`AGENTS.md`).
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
  // S1: los dias de atraso van en negrita dentro de la ventana.
  "strong",
  // S5: la cabecera de la ventana dice el nombre de la calle y cuantos
  // hechos lleva.
  "p",
]);

const CARGA = '"><img src=x onerror=alert(1)>';
const COLOR_CARGA = 'red"><script>alert(1)</script>';

const etiquetasDe = (html: string): readonly string[] =>
  [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map((coincidencia) =>
    (coincidencia[1] ?? "").toLowerCase(),
  );

const etiquetasUsadas = (html: string): readonly string[] =>
  [...new Set(etiquetasDe(html))].sort();

const etiquetasAjenas = (html: string): readonly string[] =>
  etiquetasDe(html).filter((etiqueta) => !ETIQUETAS_PERMITIDAS.has(etiqueta));

const marcadorHostil = (): MarcadorDeMapa =>
  marcadorDe(
    [
      {
        ...HECHO_DE_REPORTE,
        etiqueta: CARGA,
        href: CARGA,
        etiquetaDeTipo: CARGA,
        etiquetaDeEstado: CARGA,
        color: COLOR_CARGA,
      },
    ],
    // S5: la ventana ahora nombra la calle, y ese nombre tambien viene de la
    // base de datos.
    { calleNombre: CARGA, territorioNombre: CARGA },
  );

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

  /**
   * El caso que el guard no miraba: la ventana con **todo** lo que sabe
   * escribir -fecha, atraso y un hecho de cada recurso- y valores hostiles en
   * los cinco campos que vienen de la base. Antes de esta prueba la lista de
   * etiquetas permitidas no tenia `strong`, y la sonda pasaba solo porque su
   * unico fixture llevaba `diasDeAtraso: null`, que no imprime la senal.
   */
  it("con fecha y atraso escribe exactamente a, li, p, strong, time y ul", () => {
    const html = htmlDeLaVentana(
      marcadorDe([], {
        hechos: [
          {
            ...HECHO_DE_REPORTE,
            etiqueta: CARGA,
            href: CARGA,
            etiquetaDeTipo: CARGA,
            etiquetaDeEstado: CARGA,
            fechaCivil: "2026-11-16",
            diasDeAtraso: 9,
          },
          HECHO_DE_INTERVENCION,
        ],
        calleNombre: CARGA,
      }),
    );

    expect(etiquetasUsadas(html)).toEqual([
      "a",
      "li",
      "p",
      "strong",
      "time",
      "ul",
    ]);
    expect(etiquetasAjenas(html)).toEqual([]);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("Atrasado · 9 días");
    expect(html).toContain("16 nov 2026");
  });

  it("un color fuera de la paleta no se escribe: el pin cae al gris neutro", () => {
    const html = htmlDeMarcador(marcadorHostil());

    expect(html).toContain(`background:${COLOR_DE_ESTADO_DESCONOCIDO}`);
    expect(html).not.toContain("script");
  });
});
