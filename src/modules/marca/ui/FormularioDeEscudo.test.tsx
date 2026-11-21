import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import type { ClaveDeErrorDeEscudo } from "./mensajesDeMarca";

vi.mock("./actions/cambiarEscudo.action", () => ({
  cambiarEscudoAction: "escudo-action",
}));

const { FormularioDeEscudo, REQUISITOS_DE_ESCUDO } = await import(
  "./FormularioDeEscudo"
);

/**
 * S6, S8 y S9 del escudo, sobre el HTML que el servidor manda.
 *
 * Lo que se fija aca es el contrato del envio sin JavaScript —`<form
 * action>` nativo en multipart, con el campo que la accion lee— y las dos
 * piezas de la pantalla que la auditoria hallo ausentes: los requisitos
 * antes de elegir el archivo y el error junto al campo.
 */

const html = (error?: ClaveDeErrorDeEscudo) =>
  renderToStaticMarkup(<FormularioDeEscudo error={error} />);

const campoDeArchivo = (markup: string): string =>
  markup.match(/<input[^>]*>/g)?.[0] ?? "";

describe("FormularioDeEscudo", () => {
  it("es un formulario nativo que sube el archivo sin JavaScript", () => {
    const markup = html();

    // `action` es la Server Action y no un `onSubmit`: sin JavaScript el
    // navegador hace el POST entero, que es lo que E1 no podia hacer. El
    // `method` y el `multipart/form-data` los pone React cuando el `action`
    // es una funcion, por eso no aparecen en el HTML de este test, que
    // mockea la accion con un string; el POST sin JavaScript lo prueba
    // `e2e/marcaEscudoSinJs.spec.ts` contra el servidor de verdad.
    expect(markup).toMatch(/<form[^>]*action="escudo-action"/);
    // El nombre del campo es el que `cambiarEscudoAction` lee del FormData.
    expect(campoDeArchivo(markup)).toContain('name="escudo"');
  });

  it("los requisitos del archivo se leen antes de elegirlo (S8)", () => {
    const markup = html();
    const input = markup.indexOf("<input");
    const requisitos = markup.indexOf(REQUISITOS_DE_ESCUDO);

    expect(REQUISITOS_DE_ESCUDO).toBe(
      "Archivo PNG de hasta 1 MiB, entre 80x80 y 2048x2048 píxeles.",
    );
    expect(requisitos).toBeGreaterThan(-1);
    expect(requisitos).toBeLessThan(input);
    // Asociados al campo: un lector de pantalla los lee al enfocarlo.
    expect(campoDeArchivo(markup)).toMatch(
      /aria-describedby="[^"]*escudo-ayuda/,
    );
  });

  it("el error del archivo se pinta junto al campo y lo marca invalido (S9)", () => {
    const markup = html("escudo-pesado");
    const input = markup.indexOf("<input");
    const error = markup.indexOf("El archivo pesa más de 1 MiB.");

    expect(error).toBeGreaterThan(input);
    expect(campoDeArchivo(markup)).toContain('aria-invalid="true"');
    expect(campoDeArchivo(markup)).toMatch(
      /aria-describedby="[^"]*escudo-archivo-error/,
    );
  });

  it("sin error no pinta mensaje ni marca el campo", () => {
    const markup = html();

    expect(markup).not.toContain("aria-invalid");
    expect(campoDeArchivo(markup)).not.toContain("escudo-archivo-error");
  });

  it("el campo de archivo lleva el anillo de foco compartido, sin `outline-none`", () => {
    const markup = html();

    expect(markup.match(/<input[^>]*>/g)).toHaveLength(1);
    expect(campoDeArchivo(markup)).toContain(ANILLO_DE_FOCO);
    expect(campoDeArchivo(markup)).not.toContain("outline-none");
  });
});
