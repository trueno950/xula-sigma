import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelloDeConstancia } from "./SelloDeConstancia";

/**
 * S7 de `constancias-ux`, con la decision L6: el estado se muestra **una
 * sola vez** en el detalle, como el sello sobre la hoja. Por eso este
 * componente es el unico que lo dice y no hay insignia en la cabecera.
 */
describe("SelloDeConstancia", () => {
  it("una constancia vigente se sella con icono y palabra", () => {
    const html = renderToStaticMarkup(<SelloDeConstancia estado="VIGENTE" />);

    expect(html).toMatch(/<svg[^>]*>.*<\/svg>Vigente/);
    expect(html).not.toContain("Cancelada");
  });

  /**
   * La fecha de cancelacion y el motivo van con el sello: la hoja cancelada
   * tiene que explicarse sola, sin una insignia aparte en la cabecera.
   */
  it("una constancia cancelada dice cuando se cancelo y por que", () => {
    const html = renderToStaticMarkup(
      <SelloDeConstancia
        estado="CANCELADA"
        canceladaEn={new Date("2026-10-16T15:12:00Z")}
        motivoCancelacion="ERROR_DE_CAPTURA"
      />,
    );

    expect(html).toMatch(/<svg[^>]*>.*<\/svg>Cancelada/);
    expect(html).toContain("16 oct 2026");
    expect(html).toContain("Motivo: Error de captura");
  });

  /** El codigo del catalogo cerrado no se le enseña a la operadora. */
  it("no muestra el codigo del motivo", () => {
    const html = renderToStaticMarkup(
      <SelloDeConstancia
        estado="CANCELADA"
        canceladaEn={new Date("2026-10-16T15:12:00Z")}
        motivoCancelacion="DATOS_INCORRECTOS"
      />,
    );

    expect(html).not.toContain("DATOS_INCORRECTOS");
    expect(html).toContain("Motivo: Datos incorrectos");
  });
});
