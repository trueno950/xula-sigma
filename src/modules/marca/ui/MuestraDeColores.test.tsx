import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste, textoSobre } from "@/shared/marca";
import { MuestraDeColores } from "./MuestraDeColores";

/**
 * S3 en la muestra en vivo: el acento del municipio se ve como relleno con el
 * texto que **mide** mas contraste, no con el blanco del sistema. El hallazgo
 * M3 fue exactamente eso —el acento `#e07800` con blanco encima daba 3.01:1—
 * y la muestra no puede prometer una legibilidad que el color no tiene.
 *
 * La isla repinta leyendo `FormData`, asi que el color que mide es el que el
 * formulario va a mandar; aca se fija el primer pintado, con lo guardado.
 */

const ACENTO = "#e07800";

const markup = renderToStaticMarkup(
  <MuestraDeColores primario="oklch(0.44 0.1 155)" secundario={ACENTO} />,
);

/** El color del texto de la pastilla del acento, que es la unica del markup. */
const colorDelTextoDelAcento = (html: string): string | undefined =>
  /class="[^"]*bg-acento[^"]*"[^>]*style="color:([^;"]+)/.exec(html)?.[1] ??
  /style="color:([^;"]+)[^"]*"[^>]*class="[^"]*bg-acento/.exec(html)?.[1];

describe("MuestraDeColores", () => {
  it("el texto sobre el acento es el que mide mas contraste (S3)", () => {
    const color = colorDelTextoDelAcento(markup);

    expect(color).toBe(textoSobre(ACENTO));
    expect(contraste(ACENTO, color ?? "") ?? 0).toBeGreaterThanOrEqual(
      CONTRASTE_MINIMO,
    );
  });

  it("dice que muestra y no dibuja ningun control", () => {
    expect(markup).toContain("Con estos colores se ve así");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<button");
  });
});
