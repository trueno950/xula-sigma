import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FichaDePersona } from "./FichaDePersona";
import { PestanasDeFicha } from "./PestanasDeFicha";

const PERSONA = "11111111-1111-4111-8111-111111111111";
const CURP = "MACA050312HYNSLL09";

const pintarFicha = (props: {
  curp?: string | null;
  domicilioVigente?: string | null;
}) =>
  renderToStaticMarkup(
    <FichaDePersona
      nombre="José Armando May Canul"
      curp={props.curp === undefined ? CURP : props.curp}
      domicilioVigente={
        props.domicilioVigente === undefined
          ? "Calle 20 de la Colonia #12, Buenavista"
          : props.domicilioVigente
      }
      migaja={<a href="/padron">Padrón</a>}
      acciones={<a href="/constancias/emitir">Emitir constancia</a>}
    >
      <p>contenido de la pestaña</p>
    </FichaDePersona>,
  );

describe("FichaDePersona", () => {
  it("el nombre es el titulo de la pantalla y la CURP lleva su etiqueta", () => {
    const html = pintarFicha({});

    expect(html).toContain("<h1");
    expect(html).toContain("José Armando May Canul");
    expect(html).toContain("CURP");
    expect(html).toContain(CURP);
    expect((html.match(/<main/g) ?? []).length).toBe(1);
  });

  it("sin CURP la ficha la muestra como un pendiente con texto, no como un hueco", () => {
    const html = pintarFicha({ curp: null });

    expect(html).toContain("Sin CURP");
    expect(html).toContain("Pendiente de capturar.");
    expect(html).not.toContain(CURP);
  });

  it("el domicilio vigente lleva su etiqueta y la insignia de Vigente", () => {
    const html = pintarFicha({});

    expect(html).toContain("Domicilio vigente");
    expect(html).toContain("Calle 20 de la Colonia #12, Buenavista");
    expect(html).toContain("Vigente<");
  });

  it("sin residencia vigente dice «Sin domicilio» y no pinta la insignia", () => {
    const html = pintarFicha({ domicilioVigente: null });

    expect(html).toContain("Sin domicilio");
    expect(html).not.toContain("Vigente<");
  });

  it("las acciones de mostrador que compone la pagina viven en la cabecera", () => {
    expect(pintarFicha({})).toContain("/constancias/emitir");
  });
});

describe("PestanasDeFicha", () => {
  const pintarPestanas = (
    activa: "residencias" | "administrar",
    puedeAdministrar = true,
  ) =>
    renderToStaticMarkup(
      <PestanasDeFicha
        personaId={PERSONA}
        activa={activa}
        puedeAdministrar={puedeAdministrar}
      />,
    );

  it("cada pestaña es un enlace con su estado en la URL", () => {
    const html = pintarPestanas("residencias");

    expect(html).toContain(`href="/padron/${PERSONA}"`);
    expect(html).toContain(`href="/padron/${PERSONA}?pestana=administrar"`);
  });

  it("la pestaña activa se marca con aria-current y la otra no", () => {
    const residencias = pintarPestanas("residencias");
    const administrar = pintarPestanas("administrar");

    expect(residencias.match(/aria-current="page"/g) ?? []).toHaveLength(1);
    expect(residencias).toMatch(/aria-current="page"[^>]*>Residencias/);
    expect(administrar).toMatch(/aria-current="page"[^>]*>Administrar/);
  });

  it("sin permiso de escritura la pestaña de Administrar no se pinta", () => {
    const html = pintarPestanas("residencias", false);

    expect(html).toContain("Residencias");
    expect(html).not.toContain("Administrar");
  });
});
