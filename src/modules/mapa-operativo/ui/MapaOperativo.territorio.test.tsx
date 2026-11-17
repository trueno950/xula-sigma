import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapaOperativo } from "./MapaOperativo";
import { mapaDe } from "./mapaDePrueba";

const TERRITORIOS = [
  { id: "cabecera-1", nombre: "Motul" },
  { id: "comisaria-1", nombre: "Comisaría de Kinchil" },
];

describe("MapaOperativo: selector de territorio", () => {
  it("ofrece todo el municipio y cada raiz en el mismo formulario de filtros", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        panel="en-el-mapa"
        filtros={{}}
        mapa={mapaDe({ territorios: TERRITORIOS })}
      />,
    );

    expect(html).toContain('name="lugar"');
    expect(html).toMatch(/<option value=""[^>]*>Todo el municipio<\/option>/);
    expect(html).toContain('<option value="cabecera-1">Motul</option>');
    expect(html).toContain(
      '<option value="comisaria-1">Comisaría de Kinchil</option>',
    );
    expect(html).toContain('name="tipo"');
  });

  it("conserva el territorio elegido al enviar los filtros", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        panel="en-el-mapa"
        filtros={{ lugar: "comisaria-1" }}
        mapa={mapaDe({
          territorios: TERRITORIOS,
          territorioElegido: TERRITORIOS[1] ?? null,
        })}
      />,
    );

    expect(html).toContain('<option value="comisaria-1" selected="">');
  });

  it("avisa cuando el territorio elegido no tiene calles ubicadas", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        panel="en-el-mapa"
        filtros={{ lugar: "comisaria-1" }}
        mapa={mapaDe({
          territorios: TERRITORIOS,
          territorioElegido: TERRITORIOS[1] ?? null,
          caja: null,
        })}
      />,
    );

    expect(html).toContain(
      "Sin calles ubicadas en Comisaría de Kinchil. El mapa muestra todo Yucatán.",
    );
  });

  it("no avisa nada cuando el territorio tiene calles ubicadas", () => {
    const html = renderToStaticMarkup(
      <MapaOperativo
        panel="en-el-mapa"
        filtros={{}}
        mapa={mapaDe({ territorios: TERRITORIOS })}
      />,
    );

    expect(html).not.toContain("El mapa muestra todo Yucatán.");
  });
});
