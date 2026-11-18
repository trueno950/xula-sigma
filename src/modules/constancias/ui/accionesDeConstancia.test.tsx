import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/reimprimirConstanciaAction", () => ({
  reimprimirConstanciaAction: "reimprimir-action",
}));
vi.mock("./actions/cancelarConstanciaAction", () => ({
  cancelarConstanciaAction: "cancelar-action",
}));

const { AccionesDeConstancia } = await import("./AccionesDeConstancia");

const ID = "11111111-1111-4111-8111-111111111111";
const PERSONA = "22222222-2222-4222-8222-222222222222";

const pintar = (
  props: Partial<Parameters<typeof AccionesDeConstancia>[0]> = {},
) =>
  renderToStaticMarkup(
    <AccionesDeConstancia
      constanciaId={ID}
      personaId={PERSONA}
      cancelada={false}
      puedeReimprimir
      puedeCancelar
      {...props}
    />,
  );

/** El orden de aparicion de un texto en el HTML armado. */
const posicion = (html: string, texto: string) => html.indexOf(texto);

/**
 * S9 de `constancias-ux`: la barra de acciones del detalle. «Imprimir» es el
 * unico boton de marca, y reimprimir y cancelar son `<details>` con el mismo
 * `name` -acordeon: abrir uno cierra el otro-, «Cancelar» al final y en rojo.
 */
describe("AccionesDeConstancia", () => {
  it("«Imprimir» sigue siendo el enlace al PDF de la constancia", () => {
    expect(pintar()).toContain(`href="/constancias/${ID}/pdf"`);
  });

  /** S10: los dos formularios siguen siendo nativos y sin `use client`. */
  it("reimprimir y cancelar son formularios nativos con el id oculto", () => {
    const html = pintar();

    expect(html).toContain('action="reimprimir-action"');
    expect(html).toContain('action="cancelar-action"');
    expect(html).toContain(`name="constanciaId" value="${ID}"`);
    expect(html).toContain('name="motivo"');
    expect(html).toContain("Extravío");
    expect(html).toContain("Error de captura");
  });

  it("los dos pliegues comparten nombre, asi que abrir uno cierra el otro", () => {
    const html = pintar();

    expect(
      html.match(/<details[^>]*name="acciones-de-constancia"/g),
    ).toHaveLength(2);
  });

  it("«Cancelar constancia…» va al final y con el contorno de peligro", () => {
    const html = pintar();

    expect(posicion(html, "Reimprimir constancia…")).toBeLessThan(
      posicion(html, "Cancelar constancia…"),
    );
    expect(html).toMatch(
      /<summary[^>]*border-senial-error[^>]*text-senial-error[^>]*>Cancelar constancia…/,
    );
  });

  it("sin permiso de escritura no ofrece reimprimir y lo dice", () => {
    const html = pintar({ puedeReimprimir: false });

    expect(html).not.toContain("Reimprimir constancia…");
    expect(html).toContain("Su rol no permite reimprimir esta constancia.");
  });

  it("sin permiso de administracion no ofrece cancelar y lo dice", () => {
    const html = pintar({ puedeCancelar: false });

    expect(html).not.toContain("Cancelar constancia…");
    expect(html).toContain("Su rol no permite cancelar esta constancia.");
  });

  /**
   * Decision del lienzo: la constancia cancelada no se imprime. Tampoco se
   * reimprime ni se vuelve a cancelar; para entregar una hoja vigente hay que
   * emitir otra desde la ficha de la persona.
   */
  it("una constancia cancelada no ofrece imprimir, reimprimir ni cancelar", () => {
    const html = pintar({ cancelada: true });

    expect(html).not.toContain("Imprimir");
    expect(html).not.toContain("Reimprimir");
    expect(html).not.toContain("Cancelar constancia");
  });

  it("una constancia cancelada lleva a emitir una nueva para la misma persona", () => {
    expect(pintar({ cancelada: true })).toContain(
      `href="/constancias/emitir?personaId=${PERSONA}"`,
    );
  });
});
