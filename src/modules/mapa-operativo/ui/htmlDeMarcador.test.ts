import { describe, expect, it } from "vitest";
import type { MarcadorDeMapa } from "../domain";
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

  it("no escribe fecha: los lectores de reportes e intervenciones no la exponen", () => {
    const html = htmlDeLaVentana(marcador);

    expect(html).not.toMatch(/fecha/i);
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
