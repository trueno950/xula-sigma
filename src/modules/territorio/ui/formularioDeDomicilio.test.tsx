import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import { lugaresDeNodos, zonaDelFormulario } from "./vistaDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const sectorId = comoLugarId("33333333-3333-4333-8333-333333333333");
const manzanaId = comoLugarId("44444444-4444-4444-8444-444444444444");

const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Pablo",
    padreId: cabeceraId,
  },
  {
    clase: "lugar",
    id: sectorId,
    tipo: "sector",
    nombre: "2",
    padreId: coloniaId,
  },
  {
    clase: "lugar",
    id: manzanaId,
    tipo: "manzana",
    nombre: "San Pedro",
    padreId: sectorId,
  },
];

const calles = [
  {
    id: comoCalleId("55555555-5555-4555-8555-555555555555"),
    nombre: "Calle 21",
    lugarId: cabeceraId,
    punto: null,
  },
];

const renderFormulario = (
  lugar: {
    id: typeof cabeceraId;
    tipo: "cabecera" | "manzana";
    nombre: string;
  },
  contexto?: { raiz: string; nodo: string },
) =>
  renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      zona={zonaDelFormulario(
        lugaresDeNodos(nodos),
        { id: cabeceraId, nombre: "Tepakan" },
        lugar,
      )}
      raiz={contexto?.raiz}
      nodo={contexto?.nodo}
    />,
  );

describe("FormularioDeDomicilio: orden de campos y zona", () => {
  it("pone Calle antes de la zona y la zona como campo con etiqueta", () => {
    const html = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf('name="lugarId"'),
    );

    expect(html).not.toContain("<details");
    expect(html).toContain(
      "Sin elegir colonia, se guarda en el asentamiento de la calle.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain("Colonia (opcional)");
    // Sin contexto de navegacion no hay raiz/nodo que emitir.
    expect(html).not.toContain('name="raiz"');
    expect(html).not.toContain('name="nodo"');
  });

  it("con contexto de navegacion emite raiz y nodo ocultos", () => {
    const html = renderFormulario(
      {
        id: cabeceraId,
        tipo: "cabecera",
        nombre: "Tepakan",
      },
      { raiz: cabeceraId, nodo: coloniaId },
    );

    expect(html).toContain(
      'name="raiz" value="11111111-1111-4111-8111-111111111111"',
    );
    expect(html).toContain(
      'name="nodo" value="22222222-2222-4222-8222-222222222222"',
    );
  });

  it("en el asentamiento abre sin zona y lista el catalogo de calles", () => {
    const html = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(html).toContain("Sin colonia: Tepakan");
    expect(html).toContain("Calle 21");
  });

  it("en una manzana prefija el nodo y el resumen nombra la cadena", () => {
    const html = renderFormulario({
      id: manzanaId,
      tipo: "manzana",
      nombre: "San Pedro",
    });

    expect(html).toContain(
      "Sin cambiar la colonia, se guarda en Manzana San Pedro · Sector 2 · Colonia Pablo · Tepakan.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain(`value="${manzanaId}" selected=""`);
    expect(html).toContain("San Pedro — Tepakan › Pablo › 2");
  });
});

describe("FormularioDeDomicilio: grupos y calles", () => {
  const tres = [
    { id: "c", nombre: "Calle 9" },
    { id: "a", nombre: "Calle 12" },
    { id: "b", nombre: "Álamo" },
  ].map(({ id, nombre }) => ({
    id: comoCalleId(`${id.repeat(8)}-5555-4555-8555-555555555555`),
    nombre,
    lugarId: cabeceraId,
    punto: null,
  }));
  const html = renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(tres)}
      zona={zonaDelFormulario(
        lugaresDeNodos(nodos),
        { id: cabeceraId, nombre: "Tepakan" },
        { id: cabeceraId, tipo: "cabecera" },
      )}
    />,
  );

  it("agrupa los campos bajo Donde, Entre que calles y Referencia", () => {
    const grupos = [...html.matchAll(/<legend[^>]*>([^<]*)<\/legend>/g)].map(
      (m) => m[1],
    );

    expect(grupos).toEqual(["Dónde", "Entre qué calles", "Referencia"]);
    expect(html.match(/<fieldset/g)).toHaveLength(3);
  });

  it("ordena las calles alfabeticamente en cada select", () => {
    const select = html.slice(html.indexOf('name="calleId"'));
    const orden = ["Álamo", "Calle 9", "Calle 12"].map((n) =>
      select.indexOf(`>${n}<`),
    );

    expect(orden.every((i) => i > -1)).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
  });

  it("cada campo de calle explica para que sirve", () => {
    expect(html).toContain('id="domicilio-calle-id-ayuda"');
    expect(html).toContain('id="domicilio-entre-a-id-ayuda"');
  });

  it("el envio va en la barra de acciones", () => {
    expect(html).toContain("border-t border-caliza-divisor");
    expect(html.lastIndexOf("Dar de alta")).toBeGreaterThan(
      html.indexOf('name="referencia"'),
    );
  });
});
