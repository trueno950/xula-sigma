import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, textoSobre } from "@/shared/marca";
import { VistaPreviaDeMarca } from "./VistaPreviaDeMarca";

/**
 * La vista previa de la marca **guardada**, arriba de las secciones.
 *
 * S3: el acento se muestra como lo que es —relleno con el texto que mide mas
 * contraste— y la pantalla dice el numero medido. La version anterior ponia
 * blanco sobre el acento guardado (3.01:1) y con eso prometia una legibilidad
 * que el color no tenia.
 *
 * Se pinta desde el servidor con los tokens de la marca (`bg-marca`,
 * `bg-acento`, que salen de las variables que inyecta `(panel)/layout.tsx`),
 * asi que no hay una segunda copia del color en el cliente ni un destello
 * con la marca por defecto (antipatron 13 de `AGENTS.md`).
 */

const ESCUDO = "https://assets.prueba.local/motul/escudo.png";
const ACENTO = "#e07800";

const html = (marca: Parameters<typeof VistaPreviaDeMarca>[0]["marca"]) =>
  renderToStaticMarkup(<VistaPreviaDeMarca nombre="Motul" marca={marca} />);

describe("VistaPreviaDeMarca", () => {
  it("se titula y pinta la banda del municipio con su nombre", () => {
    const markup = html({ primario: "oklch(0.44 0.1 155)" });

    expect(markup).toContain("Cómo se ve el panel hoy");
    expect(markup).toContain("Motul");
  });

  it("pinta con los tokens de la marca y no con un color propio", () => {
    const markup = html({
      primario: "oklch(0.44 0.1 155)",
      secundario: ACENTO,
    });

    // `bg-marca`, `bg-marca-tenue` y `bg-acento` resuelven a las variables que
    // el layout inyecta desde la fila del ayuntamiento.
    expect(markup).toContain("bg-marca");
    expect(markup).toContain("bg-acento");
    expect(markup).toContain("bg-marca-suave");
  });

  it("muestra el escudo guardado cuando lo hay", () => {
    const markup = html({ escudo: ESCUDO });

    expect(markup).toContain(`src="${ESCUDO}"`);
  });

  it("sin escudo la banda queda solo con el nombre", () => {
    const markup = html({});

    expect(markup).not.toContain("<img");
    expect(markup).toContain("Motul");
  });

  it("el acento lleva encima el texto que mide mas contraste (S3)", () => {
    const markup = html({ secundario: ACENTO });
    const texto = textoSobre(ACENTO);

    expect(texto).not.toBeNull();
    expect(markup).toContain(`color:${texto}`);
  });

  it("dice el contraste medido del acento, no uno prometido", () => {
    const markup = html({ secundario: ACENTO });
    const medido = markup.match(/(\d+\.\d):1/);

    expect(medido).not.toBeNull();
    expect(Number(medido?.[1])).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
    expect(markup).toContain("El acento va de relleno");
  });
});
