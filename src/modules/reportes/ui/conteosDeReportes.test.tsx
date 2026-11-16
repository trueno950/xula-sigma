import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componerConteos } from "../domain";
import { ConteosDeReportes } from "./ConteosDeReportes";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const html = (filas: Parameters<typeof componerConteos>[0]) =>
  renderToStaticMarkup(<ConteosDeReportes conteos={componerConteos(filas)} />);

describe("ConteosDeReportes", () => {
  it("muestra los cuatro estados, con sus ceros y sus etiquetas", () => {
    const pagina = html({
      porEstado: [
        { estado: "RECIBIDO", conteo: 3 },
        { estado: "RESUELTO", conteo: 1 },
      ],
      porArea: [],
    });

    expect(pagina).toContain('aria-label="Conteo por estado"');
    expect(textoPlano(pagina)).toContain("Recibido 3");
    expect(textoPlano(pagina)).toContain("En atención 0");
    expect(textoPlano(pagina)).toContain("Resuelto 1");
    expect(textoPlano(pagina)).toContain("Rechazado 0");
  });

  it("muestra las areas con su nombre legible y «Sin asignar» para las nulas", () => {
    const pagina = html({
      porEstado: [],
      porArea: [
        { area: "OBRAS_PUBLICAS", conteo: 2 },
        { area: null, conteo: 5 },
      ],
    });

    expect(pagina).toContain('aria-label="Conteo por área"');
    expect(textoPlano(pagina)).toContain("Obras públicas 2");
    expect(textoPlano(pagina)).toContain("Sin asignar 5");
  });

  it("dice el total de los filtros elegidos", () => {
    const pagina = html({
      porEstado: [{ estado: "RECIBIDO", conteo: 4 }],
      porArea: [],
    });

    expect(textoPlano(pagina)).toContain("Total 4");
  });

  it("sin areas asignadas no dibuja un renglon vacio de areas", () => {
    const pagina = html({ porEstado: [], porArea: [] });

    expect(pagina).toContain('aria-label="Conteo por estado"');
    expect(pagina).not.toContain('aria-label="Conteo por área"');
  });
});
