import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIdDeIntervencionEnMapa } from "../domain";
import { MapaOperativo } from "./MapaOperativo";
import {
  HECHO_DE_INTERVENCION,
  HECHO_DE_REPORTE,
  mapaDe,
  marcadorDe,
} from "./mapaDePrueba";

describe("MapaOperativo", () => {
  it("distingue hechos y declara que la ubicacion de calle es aproximada", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          marcadores: [
            marcadorDe([HECHO_DE_REPORTE]),
            marcadorDe([HECHO_DE_INTERVENCION], { clave: "calle-2" }),
          ],
          conteos: { reportes: 1, intervenciones: 1, total: 2 },
        })}
      />,
    );

    expect(html).toContain("Ubicación aproximada de la calle");
    expect(html).toMatch(/1 reporte(?!s)/);
    expect(html).toMatch(/1 intervención(?!es)/);
    expect(html).toContain("Reporte ciudadano");
    expect(html).toContain("Intervención municipal");
    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/intervenciones/intervencion-1"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="estado"');
    expect(html).toContain('name="area"');
  });

  it("los filtros ofrecen etiquetas legibles y conservan el codigo como valor", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo filtros={{}} mapa={mapaDe({ estado: "VACIO" })} />,
    );

    expect(html).toContain('<option value="ALUMBRADO">Alumbrado</option>');
    expect(html).toContain(
      '<option value="EN_EJECUCION">En ejecución</option>',
    );
    expect(html).toContain(
      '<option value="AGUA_POTABLE_Y_DRENAJE">Agua potable y drenaje</option>',
    );
  });

  it("declara la calle en la cobertura faltante por calle sin punto", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          cobertura: [
            {
              id: comoIdDeIntervencionEnMapa("intervencion-2"),
              recurso: "INTERVENCION",
              etiqueta: "OBRA",
              href: "/intervenciones/intervencion-2",
              razon: "CALLE_SIN_PUNTO",
              calle: "Calle 60",
            },
          ],
          conteos: { reportes: 0, intervenciones: 1, total: 1 },
        })}
      />,
    );

    expect(html).toContain("calle sin punto: Calle 60");
  });

  it("muestra un vacio explicito cuando el filtro no deja hechos", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          estado: "VACIO",
          conteos: { reportes: 0, intervenciones: 0, total: 0 },
        })}
      />,
    );

    expect(html).toContain("No hay hechos para los filtros seleccionados.");
    expect(html).toContain("0 reportes");
    expect(html).toContain("0 intervenciones");
  });

  it("enlaza cada hecho ubicado al historial de su calle sin reemplazar su detalle", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          marcadores: [
            marcadorDe([HECHO_DE_REPORTE], {
              historiaHref: "/calles/calle-3/historial",
            }),
          ],
          conteos: { reportes: 1, intervenciones: 0, total: 1 },
        })}
      />,
    );

    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/calles/calle-3/historial"');
    expect(html).toContain("Ver historial de calle");
  });

  it("la lista sin JavaScript muestra el conteo del marcador agrupado y cada hecho", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          marcadores: [marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION])],
          conteos: { reportes: 1, intervenciones: 1, total: 2 },
        })}
      />,
    );

    expect(html).toContain("2 hechos en esta calle");
    expect(html).toContain("REP-1");
    expect(html).toContain("Obra");
    expect(html).toContain("Recibido");
    expect(html).toContain("Planificada");
  });
});

describe("MapaOperativo, calles sin ubicar por territorio (S3)", () => {
  const CALLE_SIN_PUNTO = {
    id: "calle-9",
    nombre: "Calle 21",
    href: "/territorio?raiz=raiz-1&nodo=lugar-1&vista=calles&accion=ubicarCalle&calle=calle-9",
  };

  it("dice cuántas calles no tienen punto y enlaza cada una para ubicarla", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        filtros={{}}
        mapa={mapaDe({
          sinUbicar: [
            {
              id: "raiz-1",
              nombre: "Comisaría de Kinchil",
              calles: [CALLE_SIN_PUNTO],
            },
          ],
        })}
      />,
    );

    expect(html).toContain('aria-label="Calles sin ubicar"');
    expect(html).toContain("Comisaría de Kinchil");
    expect(html).toContain(
      `href="${CALLE_SIN_PUNTO.href.replaceAll("&", "&amp;")}"`,
    );
    expect(html).toContain("Calle 21");
    expect(html).toContain("1 calle sin ubicar");
  });

  it("sin calles sin punto no dibuja la sección", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo filtros={{}} mapa={mapaDe({})} />,
    );

    expect(html).not.toContain('aria-label="Calles sin ubicar"');
  });
});
