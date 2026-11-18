import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuscadorDeTitular } from "./BuscadorDeTitular";

const GUADALUPE = {
  id: "persona-1",
  nombreCompleto: "Guadalupe Kumul Poot",
  curp: "KUPE800101MYNXXX01",
};

/**
 * S4 de `constancias-ux`: entrar sin persona elegida ya no es un callejon.
 * El buscador es un `<form method="get">` nativo, sin `"use client"`: la
 * busqueda es una lectura y una lectura ya tiene URL propia, asi que
 * `/constancias/emitir?q=gpe` funciona con JavaScript apagado — el mismo
 * criterio que `BuscadorDePersonas` del padron.
 */
describe("BuscadorDeTitular", () => {
  it("lleva su etiqueta visible, la ayuda del padron y el envio nativo", () => {
    const html = renderToStaticMarkup(<BuscadorDeTitular />);

    expect(html).toContain(">Buscar persona<");
    expect(html).toContain("Nombre, apellidos o CURP. No distingue acentos.");
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain(">Buscar<");
  });

  it("conserva lo escrito en el campo al postear", () => {
    expect(
      renderToStaticMarkup(<BuscadorDeTitular cadena="gpe kumul" />),
    ).toMatch(/value="gpe kumul"/);
  });

  it("cada resultado enlaza a la emision de esa persona", () => {
    const html = renderToStaticMarkup(
      <BuscadorDeTitular
        cadena="gpe"
        resultado={{ titulares: [GUADALUPE], hayMas: false }}
      />,
    );

    expect(html).toContain('href="/constancias/emitir?personaId=persona-1"');
    expect(html).toContain("Guadalupe Kumul Poot");
    expect(html).toContain("KUPE800101MYNXXX01");
  });

  it("a quien no tiene CURP le dice «Sin CURP» en vez de dejarlo vacio", () => {
    const html = renderToStaticMarkup(
      <BuscadorDeTitular
        cadena="gpe"
        resultado={{
          titulares: [{ ...GUADALUPE, curp: null }],
          hayMas: false,
        }}
      />,
    );

    expect(html).toContain("Sin CURP");
  });

  /** Dos vacios distintos: sin resultados no es lo mismo que sin busqueda. */
  it("sin resultados nombra la cadena y ofrece quitarla", () => {
    const html = renderToStaticMarkup(
      <BuscadorDeTitular
        cadena="zzz"
        resultado={{ titulares: [], hayMas: false }}
      />,
    );

    expect(html).toContain("Sin resultados para");
    expect(html).toContain('href="/constancias/emitir"');
    expect(html).toContain("Quitar el filtro");
  });

  it("sin busqueda no dice que no hay resultados", () => {
    expect(renderToStaticMarkup(<BuscadorDeTitular />)).not.toContain(
      "Sin resultados",
    );
  });

  it("avisa cuando hay mas resultados de los que caben", () => {
    const html = renderToStaticMarkup(
      <BuscadorDeTitular
        cadena="poot"
        resultado={{ titulares: [GUADALUPE], hayMas: true }}
      />,
    );

    expect(html).toContain("Hay más resultados: escriba más apellidos.");
  });

  it("con todos los resultados a la vista no hay aviso", () => {
    expect(
      renderToStaticMarkup(
        <BuscadorDeTitular
          cadena="poot"
          resultado={{ titulares: [GUADALUPE], hayMas: false }}
        />,
      ),
    ).not.toContain("Hay más resultados");
  });
});
