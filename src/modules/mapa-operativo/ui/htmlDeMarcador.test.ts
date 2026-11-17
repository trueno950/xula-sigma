import { describe, expect, it } from "vitest";
import { comoIdDeReporteEnMapa, type MarcadorDeMapa } from "../domain";
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

  it("el pin lleva el numero de orden de su fila, aunque la calle tenga un solo hecho", () => {
    const html = htmlDeMarcador(marcadorDe([HECHO_DE_REPORTE], { orden: 2 }));

    expect(html).toContain('data-orden="2"');
    expect(html).toContain(">2<");
  });

  /**
   * L3: la insignia del pin deja de contar hechos y pasa a llevar el orden de
   * su fila, que es lo que liga las dos vistas. El conteo se dice en la fila
   * y en la ventana, no en el pin.
   */
  it("varios hechos sobre la misma calle no cambian el numero del pin", () => {
    const marcador = marcadorDe([HECHO_DE_REPORTE, HECHO_DE_INTERVENCION], {
      orden: 1,
    });

    const html = htmlDeMarcador(marcador);

    expect(html).toContain('data-orden="1"');
    expect(html).not.toContain("data-hechos");
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

  it("nombra la calle y dice cuantos hechos lleva adentro", () => {
    const html = htmlDeLaVentana(marcador);

    expect(html).toContain("Calle 26 x 31 y 33");
    expect(html).toContain("2 hechos en esta calle");
  });

  it("una calle con un solo hecho lo dice en singular", () => {
    expect(htmlDeLaVentana(marcadorDe([HECHO_DE_REPORTE]))).toContain(
      "1 hecho en esta calle",
    );
  });

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
