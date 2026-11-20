import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIntervencionId } from "../domain";
import { ListadoDeIntervenciones } from "./ListadoDeIntervenciones";
import {
  CON_FILAS,
  conteosDePrueba,
  cuerpoDeLaColumna,
  intervencionDePrueba,
  LUGAR,
  LUGARES,
} from "./ListadoDeIntervencionesDePrueba";

describe("el tablero de la bandeja (S2, S5)", () => {
  it("S2: el resumen dice el total y el desglose con las etiquetas de las columnas", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({
          PLANIFICADA: 7,
          EN_EJECUCION: 2,
          FINALIZADA: 2,
          CANCELADA: 2,
        })}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain("13 intervenciones");
    expect(html).toContain(
      "7 planificadas, 2 en ejecución, 2 finalizadas y 2 canceladas",
    );
    expect(html).toContain("en el municipio: 7 planificadas");
    expect(html).toContain("2 canceladas.");
  });

  it("S2: con filtros, el mismo desglose dice que es con esos filtros", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{ tipo: "OBRA" }}
      />,
    );

    expect(html).toContain("1 intervención");
    expect(html).toContain("1 planificada");
    expect(html).toContain("con estos filtros");
  });

  it("S2: cada columna lleva su cuenta en el encabezado y su tarjeta", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1, CANCELADA: 2 })}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(cuerpoDeLaColumna(html, "Planificada")).toContain(">1<");
    expect(cuerpoDeLaColumna(html, "Planificada")).toContain(
      "Rehabilitación del parque municipal",
    );
    expect(cuerpoDeLaColumna(html, "En ejecución")).toContain(">0<");
    expect(cuerpoDeLaColumna(html, "Cancelada")).toContain(">2<");
  });

  it("S2: dice en qué orden estan las obras y que filtrar no lo cambia", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 1 })}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain("la ocurrencia más reciente va primero");
    expect(html).toContain("El orden no cambia al filtrar");
  });

  it("S5: una columna vacia por filtro usa las etiquetas y ofrece quitar el filtro", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={LUGARES}
        conteos={conteosDePrueba({})}
        estadoDeLista={{
          clase: "vacio-por-filtro",
          filtro: 'tipo "Fuga", lugar elegido',
        }}
        filtros={{ tipo: "FUGA", lugarId: LUGAR }}
      />,
    );

    const planificada = cuerpoDeLaColumna(html, "Planificada");

    expect(planificada).toContain("Ninguna planificada en Centro (colonia)");
    expect(planificada).not.toContain("PLANIFICADA");
    expect(planificada).toContain('href="/intervenciones"');
    expect(cuerpoDeLaColumna(html, "Cancelada")).toContain(
      "Ninguna cancelada en Centro (colonia)",
    );
    expect(html).not.toContain("Sin resultados para");
  });

  it("S5: sin filtro de lugar, la columna vacia dice que no hay con estos filtros", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={LUGARES}
        conteos={conteosDePrueba({})}
        estadoDeLista={{ clase: "vacio-por-filtro", filtro: 'tipo "Fuga"' }}
        filtros={{ tipo: "FUGA" }}
      />,
    );

    expect(cuerpoDeLaColumna(html, "En ejecución")).toContain(
      "Ninguna en ejecución con estos filtros",
    );
    expect(cuerpoDeLaColumna(html, "En ejecución")).not.toContain(
      "EN_EJECUCION",
    );
  });

  it("una columna con mas obras que las que caben enlaza al estado con todas", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[
          intervencionDePrueba(),
          intervencionDePrueba({
            id: comoIntervencionId("7a4e90ab-3333-4333-8333-333333333333"),
          }),
        ]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 9 })}
        estadoDeLista={CON_FILAS}
        filtros={{ tipo: "BACHE" }}
      />,
    );

    expect(html).toContain("Ver las 9 planificadas");
    expect(html).toContain(
      'href="/intervenciones?estado=PLANIFICADA&amp;tipo=BACHE"',
    );
  });

  it("con un estado pedido, el tablero muestra solo esa columna y sin tope", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencionDePrueba()]}
        lugares={LUGARES}
        conteos={conteosDePrueba({ PLANIFICADA: 9 })}
        estadoDeLista={CON_FILAS}
        filtros={{ estado: "PLANIFICADA" }}
      />,
    );

    expect(html.match(/<section/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("Ninguna cancelada");
    expect(html).not.toContain("Ver las 9 planificadas");
  });
});
