import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormularioDeAcceso } from "./FormularioDeAcceso";

/**
 * Lo que el servidor manda antes de que exista JavaScript en el navegador.
 *
 * Un `<form>` sin `method` envia por GET: si la persona lo envia antes de
 * que el manejador este enganchado, el correo y la contrasenia terminan en
 * la URL, en el historial y en el registro del servidor. El marcado
 * renderizado en servidor es exactamente lo que el navegador ejecuta en
 * esa ventana, asi que es lo que se prueba.
 */
describe("FormularioDeAcceso antes de hidratar", () => {
  const html = renderToString(<FormularioDeAcceso />);

  it("declara method post: la contrasenia nunca viaja en la URL", () => {
    expect(html).toMatch(/<form[^>]*\smethod="post"/);
  });

  it("deshabilita el envio hasta que el manejador este enganchado", () => {
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*\sdisabled=""/);
  });

  it("da a cada campo un anillo de foco de 2px, como el panel", () => {
    const campos = html.match(/<input[^>]*>/g) ?? [];

    expect(campos).toHaveLength(2);
    for (const campo of campos) {
      expect(campo).toContain("focus-visible:outline-2");
      expect(campo).toContain("focus-visible:outline-marca");
      // `outline-none` deja `--tw-outline-style` en none y anula el anillo.
      expect(campo).not.toContain("outline-none");
    }
  });

  it("no lleva el valor de la contrasenia en el marcado", () => {
    expect(html).not.toMatch(/name="password"[^>]*value=/);
  });
});
