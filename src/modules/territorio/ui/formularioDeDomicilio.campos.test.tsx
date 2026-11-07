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
      declaracionDeDestino="Se guarda en el asentamiento. Las calles son de su catálogo."
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
    expect(html.lastIndexOf("Registrar domicilio")).toBeGreaterThan(
      html.indexOf('name="referencia"'),
    );
  });
});

describe("FormularioDeDomicilio: origen del catalogo de calles", () => {
  it("nombra el asentamiento dueño en la ayuda del selector", () => {
    const html = renderToStaticMarkup(
      <FormularioDeDomicilio
        calles={opcionesDeCalles(calles)}
        declaracionDeDestino="Se guarda en el asentamiento. Las calles son de su catálogo."
        zona={zonaDelFormulario(
          lugaresDeNodos(nodos),
          { id: cabeceraId, nombre: "Tepakan" },
          { id: cabeceraId, tipo: "cabecera" },
        )}
        origenDeCalles="Buenavista"
      />,
    );

    expect(html).toContain("Catálogo de Buenavista");
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
      declaracionDeDestino="Se guarda en el asentamiento de la calle."
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
   * Un `<select>` deshabilitado con una sola opcion muerta se lee como un
   * control roto: sin colonias que elegir no hay select, hay una linea, y
   * el campo viaja vacio, que el alta lee como "el asentamiento de la calle".
   */
  it("explica por que no hay colonias que elegir sin un select muerto", () => {
    expect(html).toContain(
      "Todavía no hay colonias en el municipio: el domicilio se guarda en el asentamiento de la calle. Cree una colonia dentro del asentamiento para poder elegirla.",
    );
    expect(html).not.toContain("Sin colonias registradas");
    expect(html).not.toMatch(/<select[^>]*name="lugarId"/);
    expect(html).toContain('type="hidden" name="lugarId" value=""');
  });

  it("con zonas el campo de Colonia sigue habilitado", () => {
    const conZonas = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(conZonas).toContain("Colonia (opcional)");
    expect(conZonas).not.toMatch(/id="domicilio-zona-id"[^>]*disabled/);
    expect(conZonas).toContain('value="sin-colonia"');
    expect(conZonas).toContain(
      "Sin colonia (la dirección no pertenece a una colonia)",
    );
  });
});
