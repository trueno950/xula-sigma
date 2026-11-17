import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIdDeIntervencionEnMapa, comoIdDeReporteEnMapa } from "../domain";
import { MapaOperativo } from "./MapaOperativo";
import {
  HECHO_DE_REPORTE,
  mapaDe,
  marcadorDe,
  textoPlano,
} from "./mapaDePrueba";

const CALLE_SIN_PUNTO = {
  id: "calle-9",
  nombre: "Calle 21",
  href: "/territorio?raiz=raiz-1&nodo=lugar-1&vista=calles&accion=ubicarCalle&calle=calle-9",
};

const mapaConPendientes = () =>
  mapaDe({
    marcadores: [
      marcadorDe([HECHO_DE_REPORTE], {
        orden: 1,
        historiaHref: "/calles/calle-3/historial",
      }),
    ],
    cobertura: [
      {
        recurso: "REPORTE",
        id: comoIdDeReporteEnMapa("reporte-2"),
        etiqueta: "REP-2",
        href: "/reportes/detalle/reporte-2",
        razon: "SIN_CALLE",
        calle: null,
      },
    ],
    conteos: { reportes: 1, intervenciones: 0, total: 1 },
    sinUbicar: [
      {
        id: "raiz-1",
        nombre: "Comisaría de Kinchil",
        calles: [CALLE_SIN_PUNTO],
      },
    ],
  });

const render = (
  panel: "en-el-mapa" | "sin-ubicar",
  mapa = mapaConPendientes(),
) =>
  renderToStaticMarkup(
    <MapaOperativo panel={panel} filtros={{}} mapa={mapa} />,
  );

describe("MapaOperativo: pestanas del panel (S4)", () => {
  it("ofrece las dos pestanas con su cuenta y su enlace, sin depender del cliente", () => {
    const html = render("en-el-mapa");

    expect(textoPlano(html)).toContain("En el mapa 1");
    expect(textoPlano(html)).toContain("Sin ubicar 2");
    expect(html).toContain('href="/mapa-operativo?panel=sin-ubicar"');
    expect(html).toContain('href="/mapa-operativo?panel=en-el-mapa"');
  });

  it("las dos listas siguen en el HTML y se alcanzan sin JavaScript", () => {
    const html = render("en-el-mapa");

    expect(html).toContain('data-panel="en-el-mapa"');
    expect(html).toContain('data-panel="sin-ubicar"');
    expect(html).toContain("Ver historial de calle");
    expect(textoPlano(html)).toContain("Comisaría de Kinchil");
  });

  it("la pestana elegida viaja en la URL y es la unica visible", () => {
    const html = render("sin-ubicar");

    expect(html).toContain('data-panel="en-el-mapa" hidden=""');
    expect(html).toContain('data-panel="sin-ubicar"');
    expect(html).not.toContain('data-panel="sin-ubicar" hidden=""');
    expect(html).toContain('aria-current="page"');
  });
});

describe("MapaOperativo: «Sin ubicar» junta las dos secciones (S6)", () => {
  it("lista las calles sin punto con su enlace para ubicarlas", () => {
    const html = render("sin-ubicar");

    expect(html).toContain(
      'aria-label="Calles sin ubicar en Comisaría de Kinchil"',
    );
    expect(textoPlano(html)).toContain("1 calle sin ubicar");
    expect(html).toContain('href="/territorio?raiz=raiz-1&amp;nodo=lugar-1');
    expect(textoPlano(html)).toContain("Ubicar en el mapa");
  });

  it("lista los hechos sin calle con su enlace, en el mismo lugar", () => {
    const html = render("sin-ubicar");

    expect(html).toContain('aria-label="Hechos sin ubicar"');
    expect(html).toContain('aria-label="Reporte ciudadano: REP-2"');
    expect(textoPlano(html)).toContain("sin calle");
  });

  it("ya no quedan dos secciones sueltas debajo del mapa", () => {
    const html = render("sin-ubicar");

    expect(html).not.toContain("Cobertura faltante");
    expect(html).not.toContain("Calles sin ubicar</h2>");
  });

  it("sin pendientes lo dice, en vez de dejar la pestana muda", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        panel="sin-ubicar"
        filtros={{}}
        mapa={mapaDe({
          marcadores: [marcadorDe([HECHO_DE_REPORTE])],
          conteos: { reportes: 1, intervenciones: 0, total: 1 },
        })}
      />,
    );

    expect(textoPlano(html)).toContain("Todo lo que hay tiene punto");
  });
});

describe("MapaOperativo: cobertura declarada (S7)", () => {
  it("nombra la calle de un hecho que existe pero no se puede dibujar", () => {
    const html = render(
      "sin-ubicar",
      mapaDe({
        cobertura: [
          {
            recurso: "INTERVENCION",
            id: comoIdDeIntervencionEnMapa("intervencion-2"),
            etiqueta: "Obra",
            href: "/intervenciones/intervencion-2",
            razon: "CALLE_SIN_PUNTO",
            calle: "Calle 60",
          },
        ],
        conteos: { reportes: 0, intervenciones: 1, total: 1 },
      }),
    );

    expect(textoPlano(html)).toContain("calle sin punto: Calle 60");
  });
});
