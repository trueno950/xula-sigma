import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions/altaDePersona.action", () => ({
  altaDePersonaAction: "alta-action",
}));
vi.mock("./actions/sugerirDuplicados.action", () => ({
  sugerirDuplicadosAction: vi.fn(),
}));

const { FormularioDeAltaDePersona } = await import(
  "./FormularioDeAltaDePersona"
);

/**
 * S5 de `padron-ux`: los obligatorios se dicen en una linea, no con un
 * asterisco por etiqueta, igual que en el alta de reportes. Los dos que se
 * pueden dejar vacios son los mismos que `esquemaDeEntrada` de
 * `altaDePersona.action.ts` acepta sin `.min(1)`.
 */
const LINEA_DE_OBLIGATORIOS =
  "Todos los campos son obligatorios, salvo el segundo apellido y la CURP.";

const marcado = (error?: string) =>
  renderToStaticMarkup(
    <FormularioDeAltaDePersona {...(error ? { error } : {})} />,
  );

/** El `<fieldset>` completo, con su leyenda y lo que agrupa adentro. */
const grupos = (html: string) =>
  html.match(/<fieldset[\s\S]*?<\/fieldset>/g) ?? [];

describe("alta de persona", () => {
  it("nombra en una línea los dos campos opcionales", () => {
    expect(marcado()).toContain(LINEA_DE_OBLIGATORIOS);
  });

  it("la CURP queda con los datos de la persona, sin un grupo propio", () => {
    const html = marcado();
    const unico = grupos(html);

    expect(unico).toHaveLength(1);
    expect(html).not.toContain("Identificación");
    expect(unico[0]).toContain("Datos de la persona");
    expect(unico[0]).toContain('name="curp"');
  });

  it("conserva el envío nativo y los nombres de campo que lee la acción", () => {
    const html = marcado();

    expect(html).toContain('action="alta-action"');
    for (const campo of ["nombres", "primerApellido", "segundoApellido"]) {
      expect(html).toContain(`name="${campo}"`);
    }
    expect(html).toContain('name="curp"');
  });

  it("muestra el error que devuelve la acción sin tocar el resto del formulario", () => {
    const html = marcado("Nombres y primer apellido son obligatorios.");

    expect(html).toContain("Nombres y primer apellido son obligatorios.");
    expect(html).toContain(LINEA_DE_OBLIGATORIOS);
    expect(html).toContain('name="curp"');
  });
});
