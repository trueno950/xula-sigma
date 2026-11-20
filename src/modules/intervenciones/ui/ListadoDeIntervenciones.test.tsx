import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListadoDeIntervenciones } from "./ListadoDeIntervenciones";
import {
  CON_FILAS,
  conteosDePrueba,
  intervencionDePrueba,
  LUGAR,
  LUGARES,
} from "./ListadoDeIntervencionesDePrueba";

describe("los filtros de la bandeja (S1)", () => {
  it("S1: los filtros van plegados con su cuenta y un chip para quitar cada uno", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{ tipo: "BACHE", lugarId: LUGAR }}
      />,
    );

    expect(html).toContain("<details");
    expect(html).toContain("Filtros");
    expect(html).toContain("(2)");
    expect(html).toContain("Tipo: Bache");
    expect(html).toContain("Lugar: Centro (colonia)");
    expect(html).toContain('href="/intervenciones?lugarId=');
    expect(html).toContain('href="/intervenciones?tipo=BACHE"');
  });

  it("S1: sin filtros el pliegue dice (0)", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain("(0)");
    expect(html).not.toContain("Quitar filtro:");
  });

  it("S1: el formulario filtra por GET con tipo y lugar, sin el estado", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain('method="get"');
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="lugarId"');
    expect(html).not.toContain('name="estado"');
  });

  it("el chip del estado que se pidio para una columna se puede quitar", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{ estado: "PLANIFICADA", tipo: "BACHE" }}
      />,
    );

    expect(html).toContain("Estado: Planificada");
    expect(html).toContain('href="/intervenciones?tipo=BACHE"');
  });

  it("el vacio inicial no sugiere quitar un filtro que no existe ni pinta columnas", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={LUGARES}
        conteos={conteosDePrueba({})}
        estadoDeLista={{ clase: "vacio-inicial" }}
        filtros={{}}
      />,
    );

    expect(html).toContain("Todavía no hay intervenciones registradas.");
    expect(html).not.toContain("Quitar los filtros");
    expect(html).not.toContain("Ninguna planificada");
  });
});
