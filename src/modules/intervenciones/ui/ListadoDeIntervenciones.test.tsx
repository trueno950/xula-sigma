import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { IntervencionGuardada } from "../application/puertos";
import { comoIntervencionId } from "../domain";
import { ListadoDeIntervenciones } from "./ListadoDeIntervenciones";

const LUGAR = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";

const intervencion = (
  datos: Partial<IntervencionGuardada> = {},
): IntervencionGuardada => ({
  id: comoIntervencionId(ID),
  tipo: "PAVIMENTACION",
  estado: "EN_EJECUCION",
  fechaDeOcurrencia: "2026-11-16",
  lugarId: LUGAR,
  calleId: null,
  reporteId: null,
  descripcion: "Pavimentacion de la calle 20",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-11-16T15:00:00Z"),
  actualizadoEn: new Date("2026-11-16T15:00:00Z"),
  ...datos,
});

const lugares = [{ valor: LUGAR, etiqueta: "Centro (colonia)" }];
const CON_FILAS = { clase: "con-filas" } as const;

describe("ListadoDeIntervenciones", () => {
  it("muestra tipo, estado, fecha civil y lugar de cada obra, con enlace al detalle", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencion()]}
        lugares={lugares}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain(">Pavimentación<");
    expect(html).toContain(">En ejecución<");
    expect(html).toContain(">16 nov 2026<");
    expect(html).toContain("Centro (colonia)");
    expect(html).toContain(`href="/intervenciones/${ID}"`);
    expect(html).not.toContain(">PAVIMENTACION<");
    expect(html).not.toContain(`>${LUGAR}<`);
  });

  it("un lugar que la lista no pudo resolver dice No disponible, sin el uuid", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[intervencion({ lugarId: "otro-lugar" })]}
        lugares={lugares}
        estadoDeLista={CON_FILAS}
        filtros={{}}
      />,
    );

    expect(html).toContain("No disponible");
    expect(html).not.toContain("otro-lugar");
  });

  it("ofrece los tres filtros por GET y conserva el que ya esta puesto", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={lugares}
        estadoDeLista={{ clase: "vacio-por-filtro", filtro: "Bache" }}
        filtros={{ tipo: "BACHE", lugarId: LUGAR }}
      />,
    );

    expect(html).toContain('method="get"');
    expect(html).toContain('name="estado"');
    expect(html).toContain('name="tipo"');
    expect(html).toContain('name="lugarId"');
    expect(html).toContain('value="BACHE" selected');
    expect(html).toContain("Sin resultados para");
    expect(html).toContain("Quitar el filtro");
    expect(html).toContain('href="/intervenciones"');
  });

  it("el vacio inicial no sugiere quitar un filtro que no existe", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={lugares}
        estadoDeLista={{ clase: "vacio-inicial" }}
        filtros={{}}
      />,
    );

    expect(html).toContain("Todavía no hay intervenciones registradas.");
    expect(html).not.toContain("Quitar el filtro");
  });

  it("el chip del filtro puesto se puede quitar sin perder los otros", () => {
    const html = renderToStaticMarkup(
      <ListadoDeIntervenciones
        intervenciones={[]}
        lugares={lugares}
        estadoDeLista={CON_FILAS}
        filtros={{ estado: "FINALIZADA", tipo: "BACHE" }}
      />,
    );

    expect(html).toContain("Estado: Finalizada");
    expect(html).toContain("Tipo: Bache");
    expect(html).toContain('href="/intervenciones?tipo=BACHE"');
    expect(html).toContain('href="/intervenciones?estado=FINALIZADA"');
  });
});
