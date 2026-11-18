import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PersonaGuardada } from "../application/puertos";
import { comoPersonaId } from "../domain";
import { FilaDePersona } from "./FilaDePersona";

const ID = comoPersonaId("11111111-1111-4111-8111-111111111111");

const persona = (parcial: Partial<PersonaGuardada> = {}): PersonaGuardada => ({
  id: ID,
  nombres: "María Guadalupe",
  primerApellido: "Poot",
  segundoApellido: "Canul",
  curp: "POCG850101MYNNTN08",
  bajaEn: null,
  ...parcial,
});

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("FilaDePersona, domicilio vigente (S1)", () => {
  it("muestra la etiqueta del domicilio que le pasa la lista", () => {
    const html = renderToStaticMarkup(
      <FilaDePersona
        persona={persona()}
        domicilio="Calle 20 #42, Colonia Centro"
      />,
    );

    expect(html).toContain("Calle 20 #42");
    expect(html).toContain(", Colonia Centro");
  });

  it("sin residencia vigente dice «Sin domicilio»", () => {
    const html = renderToStaticMarkup(<FilaDePersona persona={persona()} />);

    expect(html).toContain("Sin domicilio");
  });
});

describe("FilaDePersona, la CURP (S2)", () => {
  it("la CURP va bajo su etiqueta y con tipografia de dato", () => {
    const html = renderToStaticMarkup(<FilaDePersona persona={persona()} />);

    expect(html).toContain(">CURP<");
    expect(html).toMatch(/tabular-nums[^>]*>POCG850101MYNNTN08</);
  });

  it("sin CURP el pendiente lleva icono y la palabra, no solo gris", () => {
    const html = renderToStaticMarkup(
      <FilaDePersona persona={persona({ curp: null })} />,
    );

    expect(html).toMatch(
      /bg-senial-aviso-suave[^>]*><svg[^>]*>.*<\/svg>Sin CURP</,
    );
    expect(html).not.toContain("POCG850101MYNNTN08");
  });
});

describe("FilaDePersona, fila tocable (S4)", () => {
  it("el enlace ocupa la fila y su nombre accesible nombra todo lo que hay", () => {
    const html = renderToStaticMarkup(
      <FilaDePersona
        persona={persona()}
        domicilio="Calle 20 #42, Colonia Centro"
      />,
    );

    expect(html).toContain(
      'href="/padron/11111111-1111-4111-8111-111111111111"',
    );
    expect(html).toContain(
      'aria-label="Abrir la ficha de Poot Canul, María Guadalupe · CURP POCG850101MYNNTN08 · Calle 20 #42, Colonia Centro"',
    );
    expect(textoPlano(html)).toContain("Poot Canul, María Guadalupe");
  });
});
