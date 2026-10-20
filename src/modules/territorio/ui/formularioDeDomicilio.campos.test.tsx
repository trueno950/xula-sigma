import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoCalleId } from "../domain";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import {
  cabeceraId,
  calles,
  nodos,
  renderFormulario,
} from "./fixturasDeFormularioDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import { lugaresDeNodos } from "./vistaDeDomicilios";
import { zonaDelFormulario } from "./zonaDelFormulario";

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

describe("FormularioDeDomicilio: la calle se elige buscando", () => {
  const html = renderFormulario({
    id: cabeceraId,
    tipo: "cabecera",
    nombre: "Tepakan",
  });

  it("junto al select de calle hay un buscador que acorta la lista", () => {
    expect(html).toContain("Buscar calle");
    expect(html).toContain('name="calleId"');
    expect(html).toContain(">Calle 21<");
  });

  it("el buscador no es un campo del formulario: solo el select lleva name", () => {
    expect(html).toMatch(
      /id="domicilio-calle-id-busqueda"(?![^>]*name=)[^>]*>/,
    );
  });
});

describe("FormularioDeDomicilio: municipio sin zonas", () => {
  const html = renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      zona={zonaDelFormulario(
        lugaresDeNodos([
          {
            clase: "lugar",
            id: cabeceraId,
            tipo: "cabecera",
            nombre: "Tepakan",
            padreId: null,
          },
        ]),
        undefined,
        undefined,
      )}
    />,
  );

  /**
   * Sin zonas el `<select>` de Colonia salia con el marcador solo, y eso se
   * lee como un campo roto. Ahora lo dice y el campo se deshabilita en vez
   * de ofrecer una lista que no existe.
   */
  it("explica por que no hay colonias que elegir y deshabilita el campo", () => {
    expect(html).toContain("Colonia (opcional)");
    expect(html).toContain("Sin colonias registradas");
    expect(html).toContain(
      "Todavía no hay colonias, sectores ni manzanas en el municipio: el domicilio se guarda en el asentamiento de la calle. Cree una colonia dentro del asentamiento para poder elegirla.",
    );
    expect(html).toMatch(/id="domicilio-zona-id"[^>]*disabled/);
  });

  it("con zonas el campo de Colonia sigue habilitado", () => {
    const conZonas = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(conZonas).toContain("Colonia (opcional)");
    expect(conZonas).not.toMatch(/id="domicilio-zona-id"[^>]*disabled/);
  });
});
