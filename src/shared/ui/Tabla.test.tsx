import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CeldaDeApoyo,
  CeldaPrincipal,
  type ColumnaDeTabla,
  FilaDeTabla,
  Tabla,
} from "./Tabla";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  {
    clave: "a",
    etiqueta: "Persona",
    orden: { href: "/x?ordenar=a", activa: "asc" },
  },
  {
    clave: "b",
    etiqueta: "Fecha",
    orden: { href: "/x?ordenar=b", activa: false },
  },
  { clave: "c", etiqueta: "Area" },
];

const tabla = (verMas?: string) =>
  renderToStaticMarkup(
    <Tabla
      etiqueta="Personas"
      columnas={COLUMNAS}
      {...(verMas ? { verMas } : {})}
    >
      <FilaDeTabla href="/p/1">
        <CeldaPrincipal>Ana</CeldaPrincipal>
      </FilaDeTabla>
      <FilaDeTabla>
        <CeldaPrincipal>Sin enlace</CeldaPrincipal>
      </FilaDeTabla>
    </Tabla>,
  );

describe("Tabla", () => {
  it("es una tarjeta que recorta sin crear contenedor de scroll", () => {
    const html = tabla();

    expect(html).toContain("rounded-lg");
    expect(html).toContain("shadow-reposo");
    expect(html).toContain("border-caliza-divisor");
    // `overflow-hidden` rompe el `sticky` del encabezado; `clip` recorta igual.
    expect(html).toContain("overflow-clip");
    expect(html).not.toMatch(/overflow-(x-)?(auto|scroll|hidden)/);
  });

  it("el encabezado es pegajoso, de 40px y en superficie", () => {
    const html = tabla();

    expect(html).toContain("sticky");
    expect(html).toContain("h-10");
    expect(html).toContain("bg-caliza-superficie");
    expect(html).not.toContain("h-9");
  });

  it("las filas miden 48px en escritorio y 56px como minimo en movil", () => {
    const html = tabla();

    expect(html).toContain("sm:h-12");
    expect(html).toContain("min-h-14");
    expect(html).not.toContain("h-11");
  });

  it("solo la fila accionable lleva chevron", () => {
    const html = tabla();

    expect(html.match(/data-chevron/g)).toHaveLength(1);
    expect(html).toContain("hover:bg-caliza-superficie");
  });

  it("la flecha de orden aparece solo en la columna activa", () => {
    const html = tabla();

    expect(html).toContain("Persona, ordenado ascendente");
    expect(html).toContain("Fecha, sin ordenar");
    expect(html.match(/data-orden-flecha/g)).toHaveLength(1);
  });

  it("no pinta cebra ni sombra en las filas", () => {
    const html = tabla();

    expect(html).not.toContain("odd:");
    expect(html).not.toContain("even:");
    expect(html.match(/shadow-/g)).toHaveLength(1);
  });

  it("Ver mas es un boton secundario y desaparece sin mas filas", () => {
    expect(tabla("/x?limite=100")).toContain('href="/x?limite=100"');
    expect(tabla("/x?limite=100")).toContain("border-caliza-borde");
    expect(tabla()).not.toContain("Ver más");
  });
});

describe("CeldaDeApoyo", () => {
  it("es texto de apoyo en Label, sin tipografia de dato", () => {
    const html = renderToStaticMarkup(<CeldaDeApoyo>Obras</CeldaDeApoyo>);

    expect(html).toContain("Obras");
    expect(html).not.toContain("font-mono");
  });
});
