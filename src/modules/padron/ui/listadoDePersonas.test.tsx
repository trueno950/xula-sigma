import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PersonaGuardada } from "../application/puertos";
import { comoPersonaId } from "../domain";
import { ListadoDePersonas } from "./ListadoDePersonas";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const persona = (
  id: string,
  nombres: string,
  primerApellido: string,
): PersonaGuardada => ({
  id: comoPersonaId(id),
  nombres,
  primerApellido,
  segundoApellido: null,
  curp: null,
  bajaEn: null,
});

const DOS = [
  persona("11111111-1111-4111-8111-111111111111", "María", "Poot"),
  persona("22222222-2222-4222-8222-222222222222", "José", "May"),
];

const ALTA = <a href="/padron/alta">Nueva persona</a>;

type Props = Parameters<typeof ListadoDePersonas>[0];

const html = (props: Partial<Props>) =>
  renderToStaticMarkup(
    <ListadoDePersonas personas={DOS} accionDeAlta={ALTA} {...props} />,
  );

describe("ListadoDePersonas, cuántas y con qué orden (S3)", () => {
  it("dice cuántas personas muestra y cuántas del total en el pie", () => {
    const pagina = html({});

    expect(textoPlano(pagina)).toContain("2 personas");
    expect(textoPlano(pagina)).toContain("Mostrando 1–2 de 2 personas");
    expect(textoPlano(pagina)).toContain("por apellidos, de la A a la Z");
  });

  it("la búsqueda se nombra, se puede quitar y no cambia el orden pedido", () => {
    const pagina = html({
      filtro: "poot",
      orden: { campo: "persona", direccion: "desc" },
    });

    expect(textoPlano(pagina)).toContain("2 personas para «poot»");
    expect(textoPlano(pagina)).toContain("por apellidos, de la Z a la A");
    expect(pagina).toContain(
      'href="/padron?ordenar=persona&amp;direccion=desc"',
    );
    expect(pagina).toContain("Quitar filtro: poot");
  });

  it("sin orden pedido, una búsqueda se lee por relevancia", () => {
    expect(textoPlano(html({ filtro: "poot" }))).toContain("por relevancia");
  });

  it("una sola persona se nombra en singular, arriba y en el pie", () => {
    const pagina = renderToStaticMarkup(
      <ListadoDePersonas personas={[DOS[0] as PersonaGuardada]} />,
    );
    const texto = textoPlano(pagina);

    expect(texto).toContain("1 persona");
    expect(texto).toContain("Mostrando 1–1 de 1 persona");
  });

  it("con otra página por delante dice lo que muestra y ofrece seguir", () => {
    const pagina = renderToStaticMarkup(
      <ListadoDePersonas personas={[DOS[0] as PersonaGuardada]} hayMas />,
    );

    expect(textoPlano(pagina)).toContain("Mostrando 1–1 persona");
    expect(pagina).toContain(">Ver más<");
    expect(pagina).toContain('href="/padron?limite=100"');
  });

  it("cada fila entra a la ficha de su persona", () => {
    expect(html({})).toContain(
      'href="/padron/11111111-1111-4111-8111-111111111111"',
    );
  });
});

describe("ListadoDePersonas, el domicilio de cada fila (S1)", () => {
  it("pinta la etiqueta que le pasa la página para esa persona", () => {
    const pagina = html({
      domicilios: new Map([
        ["11111111-1111-4111-8111-111111111111", "Calle 20 #42, Centro"],
      ]),
    });

    expect(pagina).toContain("Calle 20 #42");
    expect(textoPlano(pagina)).toContain("Sin domicilio");
  });
});

describe("ListadoDePersonas, los dos vacíos (S3)", () => {
  it("el padrón vacío dice qué es la pantalla y ofrece el primer alta", () => {
    const pagina = renderToStaticMarkup(
      <ListadoDePersonas personas={[]} accionDeAlta={ALTA} />,
    );

    expect(pagina).toContain("Todavía no hay personas en el padrón.");
    expect(pagina).toContain('href="/padron/alta"');
    expect(pagina).not.toContain("Sin resultados para");
  });

  it("una búsqueda sin resultados nombra la búsqueda y ofrece quitarla", () => {
    const pagina = renderToStaticMarkup(
      <ListadoDePersonas personas={[]} filtro="yáñez" accionDeAlta={ALTA} />,
    );

    expect(pagina).toContain("Sin resultados para");
    expect(pagina).toContain("yáñez");
    expect(pagina).toContain(">Quitar el filtro<");
    expect(pagina).toContain('href="/padron"');
  });

  it("en el teléfono el alta sigue a mano en la búsqueda sin resultados", () => {
    const pagina = renderToStaticMarkup(
      <ListadoDePersonas personas={[]} filtro="yáñez" accionDeAlta={ALTA} />,
    );

    expect(pagina).toMatch(/sm:hidden[^>]*><a href="\/padron\/alta"/);
  });
});
