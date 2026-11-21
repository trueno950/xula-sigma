import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { FormularioDeQuitarEscudo } from "./FormularioDeQuitarEscudo";

/**
 * S7: «Quitar escudo» es su propio formulario nativo, con la casilla de
 * confirmacion que el servidor vuelve a exigir. Sin JavaScript no hay dialogo
 * que pregunte antes, asi que la pregunta es la casilla —igual que la baja de
 * usuarios y el restablecimiento de colores—: sin ella no se escribe una fila
 * ni se borra un objeto del almacen.
 */

vi.mock("./actions/quitarEscudoAction", () => ({
  quitarEscudoAction: "quitar-escudo-action",
}));

const markup = renderToStaticMarkup(
  <FormularioDeQuitarEscudo nombre="Motul" />,
);

const casilla = (): string =>
  markup.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? "";

describe("FormularioDeQuitarEscudo", () => {
  it("es un POST nativo que dice que ambito quita", () => {
    expect(markup).toContain('action="quitar-escudo-action"');
    expect(markup).toContain('name="ambito"');
    expect(markup).toContain('value="escudo"');
  });

  it("pide la confirmacion con el campo que la accion exige", () => {
    expect(casilla()).toContain('name="confirmar"');
    expect(casilla()).toContain('value="si"');
    expect(casilla()).toContain("required");
    expect(casilla()).toContain(ANILLO_DE_FOCO);
    expect(markup).toContain("Confirmo quitar el escudo de Motul");
  });

  it("nombra la consecuencia y el boton es de peligro", () => {
    expect(markup).toContain("la banda del municipio queda solo con el nombre");
    expect(markup).toContain("Quitar escudo");
    expect(markup).toContain("text-senial-error");
  });

  it("avisa que el servidor tambien exige la casilla", () => {
    expect(markup).toContain("el servidor también la exige");
  });
});
