import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InsigniaDeEstado, type TonoDeInsignia } from "./InsigniaDeEstado";

const TONOS: readonly TonoDeInsignia[] = ["neutro", "exito", "aviso", "error"];

const insignia = (tono: TonoDeInsignia) =>
  renderToStaticMarkup(<InsigniaDeEstado tono={tono} etiqueta="En atención" />);

describe("InsigniaDeEstado", () => {
  it("siempre lleva icono y palabra, en todo tono", () => {
    for (const tono of TONOS) {
      const html = insignia(tono);

      expect(html).toContain("<svg");
      expect(html).toContain("En atención");
    }
  });

  it("el icono es decorativo y la palabra es el nombre accesible", () => {
    const html = insignia("exito");

    expect(html).toContain('aria-hidden="true"');
    expect(html.replace(/<svg.*?<\/svg>/g, "")).toContain("En atención");
  });

  it("es una pastilla de 24px con icono de 14px", () => {
    const html = insignia("aviso");

    expect(html).toContain("rounded-pill");
    expect(html).toContain("h-6");
    expect(html).toContain('width="14"');
  });

  it("cada senal usa su fondo suave y su tono fuerte", () => {
    expect(insignia("exito")).toContain("bg-senial-exito-suave");
    expect(insignia("exito")).toContain("text-senial-exito");
    expect(insignia("aviso")).toContain("bg-senial-aviso-suave");
    expect(insignia("aviso")).toContain("text-senial-aviso");
    expect(insignia("error")).toContain("bg-senial-error-suave");
    expect(insignia("error")).toContain("text-senial-error");
  });

  it("el neutro es relleno con tinta y nunca toma la marca", () => {
    const html = insignia("neutro");

    expect(html).toContain("bg-caliza-relleno");
    expect(html).toContain("text-caliza-tinta");
    expect(html).not.toContain("marca");
  });

  it("no usa mayusculas sostenidas ni sombra", () => {
    for (const tono of TONOS) {
      const html = insignia(tono);

      expect(html).not.toContain("uppercase");
      expect(html).not.toContain("shadow");
    }
  });

  it("los tonos se distinguen por icono ademas de por color", () => {
    const iconos = TONOS.map(
      (tono) => insignia(tono).match(/<svg.*?<\/svg>/)?.[0],
    );

    expect(new Set(iconos).size).toBe(TONOS.length);
  });
});
