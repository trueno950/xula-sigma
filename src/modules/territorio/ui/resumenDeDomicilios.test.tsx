import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OpcionDeLista } from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";
import { comoLugarId } from "../domain";
import { PieDeDomicilios, ResumenDeDomicilios } from "./ResumenDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const raices: readonly OpcionDeLista[] = [
  { valor: cabeceraId, etiqueta: "Tepakan (cabecera)" },
];

type Props = Parameters<typeof ResumenDeDomicilios>[0];

const render = (props: Partial<Props> & { filtros?: FiltrosDeRegistro }) =>
  renderToStaticMarkup(
    <ResumenDeDomicilios
      mostrados={2}
      total={9}
      coincidencias={2}
      filtros={{}}
      raices={raices}
      {...props}
    />,
  );

describe("ResumenDeDomicilios", () => {
  it("sin filtros dice cuantos domicilios hay registrados y con que orden", () => {
    const html = render({ coincidencias: 9, total: 9 });

    expect(html).toContain("9");
    expect(html).toContain("domicilios registrados");
    expect(html).toContain("por asentamiento, calle y número");
    expect(html).not.toContain("Quitar filtro");
  });

  /**
   * El «de T» es el total del municipio, no el de la pagina: por eso la
   * linea no puede caer a «2 domicilios» cuando la busqueda trae dos de
   * nueve. El total lo devuelve el conteo del registro.
   */
  it("con busqueda dice las coincidencias y el total del municipio", () => {
    const html = render({ filtros: { busqueda: "Calle 20" } });

    expect(html).toContain("2");
    expect(html).toContain("9");
    expect(html).toContain("domicilios para «Calle 20»");
  });

  it("un filtro sin busqueda cuenta igual pero no dice «para»", () => {
    const html = render({ filtros: { raizId: cabeceraId } });

    expect(html).toContain("domicilios");
    expect(html).not.toContain("para «");
    expect(html).toContain("Asentamiento: Tepakan (cabecera)");
  });

  it("un solo domicilio se dice en singular", () => {
    const html = render({ coincidencias: 1, total: 1 });

    expect(html).toContain("1");
    expect(html).toContain("domicilio registrado");
    expect(html).not.toContain("domicilios registrados");
  });

  /**
   * La degradacion que documenta el artboard: sin conteo no se inventa un
   * total, se dice lo que trajo la pagina.
   */
  it("sin conteo cae a los domicilios de la pagina, sin inventar un total", () => {
    const html = render({
      total: undefined,
      coincidencias: undefined,
      mostrados: 2,
      filtros: { busqueda: "Calle 20" },
    });

    expect(html).toContain("domicilios para «Calle 20»");
    expect(html).toContain(">2</span>");
    expect(html).not.toContain(" de ");
  });

  it("cada filtro puesto es un chip que lo quita y conserva los otros", () => {
    const html = render({
      filtros: { busqueda: "Calle 20", raizId: cabeceraId },
    });

    expect(html).toContain("Quitar filtro: Búsqueda: Calle 20");
    expect(html).toContain("Quitar filtro: Asentamiento: Tepakan (cabecera)");
    expect(html).toContain(`href="/territorio/domicilios?raiz=${cabeceraId}"`);
    expect(html).toContain('href="/territorio/domicilios?q=Calle+20"');
  });
});

describe("PieDeDomicilios", () => {
  it("dice lo que se esta viendo de las coincidencias", () => {
    const html = renderToStaticMarkup(
      <PieDeDomicilios mostrados={2} coincidencias={5} />,
    );

    expect(html).toContain("Mostrando");
    expect(html).toContain("1–2");
    expect(html).toContain("5");
  });
});
