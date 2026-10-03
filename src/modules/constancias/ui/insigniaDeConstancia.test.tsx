import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InsigniaDeConstancia } from "./InsigniaDeConstancia";

describe("InsigniaDeConstancia", () => {
  it("vigente se pinta con icono, palabra y tono de exito", () => {
    const html = renderToStaticMarkup(
      <InsigniaDeConstancia cancelada={false} />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("Vigente</span>");
    expect(html).toContain("bg-senial-exito-suave");
  });

  it("cancelada se pinta con icono, palabra y tono de error", () => {
    const html = renderToStaticMarkup(<InsigniaDeConstancia cancelada />);

    expect(html).toContain("<svg");
    expect(html).toContain("Cancelada</span>");
    expect(html).toContain("bg-senial-error-suave");
  });
});
