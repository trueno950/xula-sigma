import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoCalleId, type EntradaDeHistorial } from "../domain";
import { LineaDeTiempoDeCalle } from "./HistorialDeCalle";

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");

const dibujar = (...entradas: EntradaDeHistorial[]) =>
  renderToStaticMarkup(
    <LineaDeTiempoDeCalle
      historial={{ calleId, estado: "CON_DATOS", entradas }}
    />,
  );

const entrada = (
  naturaleza: EntradaDeHistorial["naturaleza"],
  id = "e1",
): EntradaDeHistorial => ({
  id,
  naturaleza,
  precision: "MOMENTO",
  ocurridoEn: new Date("2026-09-22T15:30:00.000Z"),
});

describe("LineaDeTiempoDeCalle: detalle legible", () => {
  it.each([
    ["RENOMBRE", "Se cambió el nombre de la calle."],
    ["REPARENTEO", "Se movió la calle a otro lugar."],
    ["UBICACION", "Se actualizó el punto de la calle en el mapa."],
  ] as const)("%s dice qué pasó en una frase", (naturaleza, frase) => {
    expect(dibujar(entrada(naturaleza))).toContain(frase);
  });

  it("un reporte enlaza a su detalle por id", () => {
    const html = dibujar(entrada("REPORTE", "rep-1"));

    expect(html).toContain("Se registró un reporte en esta calle.");
    expect(html).toMatch(/<a [^>]*href="\/reportes\/detalle\/rep-1"/);
    expect(html).toContain("Ver reporte");
  });

  it("una intervención enlaza a su detalle por id", () => {
    const html = dibujar(entrada("INTERVENCION", "int-1"));

    expect(html).toContain("Se registró una intervención en esta calle.");
    expect(html).toMatch(/<a [^>]*href="\/intervenciones\/int-1"/);
    expect(html).toContain("Ver intervención");
  });

  it("los hechos estructurales no inventan enlaces", () => {
    const html = dibujar(
      entrada("RENOMBRE", "a"),
      entrada("REPARENTEO", "b"),
      entrada("UBICACION", "c"),
    );

    expect(html).toContain("Se cambió el nombre de la calle.");
    expect(html).toContain("Se movió la calle a otro lugar.");
    expect(html).toContain("Se actualizó el punto de la calle en el mapa.");
    expect(html).not.toContain("<a ");
  });

  it("cada naturaleza lleva un icono distinto", () => {
    const iconos = (
      [
        "REPORTE",
        "INTERVENCION",
        "RENOMBRE",
        "REPARENTEO",
        "UBICACION",
      ] as const
    ).map((n) => dibujar(entrada(n)).match(/<svg[\s\S]*?<\/svg>/)?.[0]);

    expect(new Set(iconos).size).toBe(5);
  });

  it("la etiqueta va en Title y la fecha en Dato dentro de una lista", () => {
    const html = dibujar(entrada("RENOMBRE"));

    expect(html).toContain("<ol");
    expect(html).toMatch(/font-semibold[^>]*>Renombre</);
    expect(html).toMatch(/22 sep\.? 2026/);
  });

  it("no dibuja franjas laterales ni degradados", () => {
    const html = dibujar(entrada("REPORTE"), entrada("RENOMBRE", "x"));

    expect(html).toContain("Se registró un reporte en esta calle.");
    expect(html).toContain("Se cambió el nombre de la calle.");
    expect(html).not.toMatch(/border-l-|border-r-|gradient/);
  });

  it("el vacío lleva icono y dice qué aparecerá", () => {
    const html = renderToStaticMarkup(
      <LineaDeTiempoDeCalle
        historial={{ calleId, estado: "VACIO", entradas: [] }}
      />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain(
      "Aquí aparecerán sus reportes, intervenciones y cambios.",
    );
  });
});
