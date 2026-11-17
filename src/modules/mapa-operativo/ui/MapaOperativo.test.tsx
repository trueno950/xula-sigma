import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapaOperativo } from "./MapaOperativo";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  mapaDe,
  marcadorDe,
  textoPlano,
} from "./mapaDePrueba";

const CON_UN_HECHO_ATRASADO = {
  ...HECHO_DE_REPORTE,
  diasDeAtraso: 9,
};

const mapaConHechos = () =>
  mapaDe({
    marcadores: [
      marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION], {
        orden: 1,
        historiaHref: "/calles/calle-3/historial",
      }),
    ],
    conteos: { reportes: 1, intervenciones: 1, total: 2 },
    leyenda: {
      tipos: [],
      estados: [],
      atrasados: 1,
      total: 2,
    },
  });

const render = (mapa = mapaConHechos(), filtros = {}) =>
  renderToStaticMarkup(
    <MapaOperativo panel="en-el-mapa" filtros={filtros} mapa={mapa} />,
  );

describe("MapaOperativo: orden de la pantalla (S1)", () => {
  it("pone la barra de filtros, despues el resumen con chips y al final el mapa con su panel", () => {
    const html = render(mapaConHechos(), { estado: "RECIBIDO" });

    const filtros = html.indexOf('aria-label="Filtros del mapa"');
    const resumen = html.indexOf('aria-label="Resumen del mapa"');
    const mapa = html.indexOf('aria-label="Mapa de hechos por calle"');

    expect(filtros).toBeGreaterThan(-1);
    expect(resumen).toBeGreaterThan(filtros);
    expect(mapa).toBeGreaterThan(resumen);
  });

  it("resume en numeros fuertes: hechos, calles dibujadas, atrasados y sin ubicar", () => {
    const html = render();

    expect(textoPlano(html)).toContain(
      "2 hechos 1 calle en el mapa 1 atrasado 0 sin ubicar",
    );
  });

  /**
   * Con cero atrasados el numero no se pinta en la senal de error: una alarma
   * permanente por algo que no pasa deja de significar algo.
   */
  it("pinta el numero de atrasados en senal solo cuando hay alguno", () => {
    const conAtraso = render();
    const sinAtraso = render(
      mapaDe({
        marcadores: [marcadorDe([HECHO_DE_REPORTE])],
        conteos: { reportes: 1, intervenciones: 0, total: 1 },
      }),
    );

    expect(conAtraso).toContain("text-senial-error");
    expect(sinAtraso).not.toContain("text-senial-error");
  });

  it("muestra cada filtro puesto como chip removible, con los otros conservados", () => {
    const html = render(mapaConHechos(), { tipo: "BACHE", area: undefined });

    expect(html).toContain("Tipo: Bache");
    expect(html).toContain('href="/mapa-operativo"');
  });

  /**
   * S2: los filtros se pliegan detras de un `<details>` que cuenta los
   * puestos, y arrancan plegados. El cliente los abre desde 1024px; el HTML
   * del servidor no lleva `open`, que es lo que hace que en el telefono el
   * mapa quede justo debajo del resumen.
   */
  it("los filtros se pliegan detras de un details que cuenta los puestos", () => {
    const sinFiltros = render();
    const conFiltros = render(mapaConHechos(), {
      tipo: "BACHE",
      estado: "RECIBIDO",
    });

    expect(sinFiltros).toContain("<details");
    expect(sinFiltros).not.toContain("<details open");
    expect(textoPlano(sinFiltros)).toContain("Filtros (0)");
    expect(textoPlano(conFiltros)).toContain("Filtros (2)");
  });

  it("la ubicacion aproximada se dice en la cabecera del mapa, una sola vez", () => {
    const html = render();
    const apariciones =
      html.split("Ubicación aproximada de la calle").length - 1;

    expect(apariciones).toBe(1);
    expect(html).toContain("1 calle con hechos");
  });
});

describe("MapaOperativo: la calle de cada fila (S4 y S5)", () => {
  it("numera la fila igual que el pin y nombra la calle y su territorio", () => {
    const html = render(
      mapaDe({
        marcadores: [
          marcadorDe([HECHO_DE_REPORTE], {
            orden: 3,
            calleNombre: "Calle 21",
            territorioNombre: "Motul",
          }),
        ],
        conteos: { reportes: 1, intervenciones: 0, total: 1 },
      }),
    );

    expect(html).toContain('data-numero-de-fila="3"');
    expect(textoPlano(html)).toContain("Calle 21");
    expect(textoPlano(html)).toContain("Motul");
    expect(textoPlano(html)).toContain("1 hecho en esta calle");
  });

  it("cada hecho lleva folio, estado con su palabra, tipo, fecha y atraso", () => {
    const html = render(
      mapaDe({
        marcadores: [
          marcadorDe([CON_UN_HECHO_ATRASADO], {
            historiaHref: "/calles/calle-3/historial",
          }),
        ],
        conteos: { reportes: 1, intervenciones: 0, total: 1 },
      }),
    );
    const texto = textoPlano(html);

    expect(html).toContain('aria-label="Reporte ciudadano: REP-1"');
    expect(texto).toContain("Recibido");
    expect(texto).toContain("Bache");
    expect(texto).toContain("16 nov 2026");
    expect(texto).toContain("Atrasado · 9 días");
    expect(html).toContain('href="/calles/calle-3/historial"');
    expect(texto).toContain("Ver historial de calle");
  });

  it("la leyenda vive dentro del mapa y no repite el recurso en cada tipo", () => {
    const html = render(
      mapaDe({
        marcadores: [marcadorDe([HECHO_DE_REPORTE])],
        conteos: { reportes: 1, intervenciones: 0, total: 1 },
        leyenda: {
          tipos: [
            {
              recurso: "REPORTE",
              tipo: "BACHE",
              etiqueta: "Bache",
              icono: "BACHE",
              conteo: 1,
            },
          ],
          estados: [
            {
              estado: "RECIBIDO",
              etiqueta: "Recibido",
              color: "#b45309",
              conteo: 1,
            },
          ],
          atrasados: 0,
          total: 1,
        },
      }),
    );
    const mapa = html.indexOf('aria-label="Mapa de hechos por calle"');
    const leyenda = html.indexOf('aria-label="Leyenda del mapa"');

    expect(leyenda).toBeGreaterThan(mapa);
    expect(textoPlano(html)).toContain("Bache 1");
    expect(textoPlano(html)).not.toContain("(reporte)");
  });
});
