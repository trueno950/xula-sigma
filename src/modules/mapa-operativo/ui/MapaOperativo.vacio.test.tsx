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

const render = (mapa = mapaDe({}), filtros = {}) =>
  renderToStaticMarkup(
    <MapaOperativo panel="en-el-mapa" filtros={filtros} mapa={mapa} />,
  );

describe("MapaOperativo: los caminos que ya funcionan (S7)", () => {
  it("los filtros siguen siendo un form GET con los cuatro campos", () => {
    const html = render();

    expect(html).toContain('method="get"');
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="estado"');
    expect(html).toContain('name="area"');
    expect(html).toContain('name="lugar"');
  });

  it("sin JavaScript la lista sigue en el HTML como alternativa al mapa", () => {
    const html = render(
      mapaDe({
        marcadores: [marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION])],
        conteos: { reportes: 1, intervenciones: 1, total: 2 },
      }),
    );

    expect(html).toContain('href="/reportes/detalle/reporte-1"');
    expect(html).toContain('href="/intervenciones/intervencion-1"');
  });

  it("sin resultados ofrece el vacio por filtro con la forma de quitarlos", () => {
    const html = render(
      mapaDe({
        estado: "VACIO",
        conteos: { reportes: 0, intervenciones: 0, total: 0 },
      }),
      { tipo: "BACHE" },
    );

    expect(textoPlano(html)).toContain("Sin resultados para");
    expect(textoPlano(html)).toContain("Tipo: Bache");
    expect(textoPlano(html)).toContain("Quitar el filtro");
    expect(html).toContain('href="/mapa-operativo"');
    expect(html).not.toContain('aria-label="Mapa de hechos por calle"');
  });

  it("sin hechos, las calles sin ubicar siguen al alcance para ubicarlas", () => {
    const html = render(
      mapaDe({
        estado: "VACIO",
        conteos: { reportes: 0, intervenciones: 0, total: 0 },
        sinUbicar: [
          {
            id: "lugar-1",
            nombre: "Kiní",
            calles: [
              {
                id: "calle-9",
                nombre: "Calle 15",
                href: "/territorio/calles/calle-9",
              },
            ],
          },
        ],
      }),
    );

    expect(textoPlano(html)).toContain(
      "Todavía no hay reportes ni obras abiertas en el municipio.",
    );
    expect(html).toContain('href="/territorio/calles/calle-9"');
    expect(textoPlano(html)).toContain("Calle 15");
  });

  it("sin filtros puestos y sin hechos explica que la pantalla esta vacia", () => {
    const html = render(
      mapaDe({
        estado: "VACIO",
        conteos: { reportes: 0, intervenciones: 0, total: 0 },
      }),
    );

    expect(textoPlano(html)).toContain(
      "Todavía no hay reportes ni obras abiertas en el municipio.",
    );
  });
});
