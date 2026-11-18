import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TAMANO_DE_PAGINA } from "../application/listarReportes";
import { componerConteos } from "../domain";
import { camposDeLaUrl, hrefDeEstado } from "./hrefsDeListado";
import { PestanasDeEstado } from "./PestanasDeEstado";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Los conteos de las pestañas: el estado quitado, los otros filtros puestos. */
const CONTEO_POR_ESTADO = componerConteos({
  porEstado: [
    { estado: "RECIBIDO", conteo: 3 },
    { estado: "EN_ATENCION", conteo: 2 },
    { estado: "RESUELTO", conteo: 3 },
    { estado: "RECHAZADO", conteo: 1 },
  ],
  porArea: [],
});

const HREFS = {
  todos: "/reportes",
  RECIBIDO: "/reportes?estado=RECIBIDO",
  EN_ATENCION: "/reportes?estado=EN_ATENCION",
  RESUELTO: "/reportes?estado=RESUELTO",
  RECHAZADO: "/reportes?estado=RECHAZADO",
} as const;

const html = (extras: { estado?: "RECIBIDO"; soloAtrasados?: boolean } = {}) =>
  renderToStaticMarkup(
    <PestanasDeEstado
      conteos={CONTEO_POR_ESTADO}
      totalDeAtrasados={3}
      hrefs={HREFS}
      camposOcultos={[
        { nombre: "tipo", valor: "BACHE" },
        { nombre: "q", valor: "calle 26" },
      ]}
      {...extras}
    />,
  );

describe("PestanasDeEstado", () => {
  it("las cinco pestañas llevan su cuenta y «Todos» lleva el total", () => {
    const texto = textoPlano(html());

    expect(texto).toContain("Recibidos 3");
    expect(texto).toContain("En atención 2");
    expect(texto).toContain("Resueltos 3");
    expect(texto).toContain("Rechazados 1");
    expect(texto).toContain("Todos 9");
  });

  it("cada pestaña es un enlace a su URL, sin estado de cliente", () => {
    const pagina = html();

    expect(pagina).toContain('href="/reportes?estado=RECIBIDO"');
    expect(pagina).toContain('href="/reportes?estado=RECHAZADO"');
    expect(pagina).toContain('href="/reportes"');
  });

  it("solo la pestaña del estado puesto lleva aria-current", () => {
    const pagina = html({ estado: "RECIBIDO" });

    expect(pagina.match(/aria-current="page"/g)).toHaveLength(1);
    expect(pagina).toMatch(
      /<a(?=[^>]*href="\/reportes\?estado=RECIBIDO")(?=[^>]*aria-current="page")[^>]*>/,
    );
  });

  it("sin estado en la URL la activa es «Todos»", () => {
    const pagina = html();

    expect(pagina).toMatch(
      /<a(?=[^>]*href="\/reportes")(?=[^>]*aria-current="page")[^>]*>/,
    );
  });

  it("el interruptor de atrasados lleva su cuenta y conserva los otros filtros", () => {
    const pagina = html();

    expect(pagina).toContain("<form");
    expect(pagina).toContain('method="get"');
    expect(pagina).toContain('name="tipo" value="BACHE"');
    expect(pagina).toContain('name="q" value="calle 26"');
    expect(textoPlano(pagina)).toContain("Solo atrasados 3");
  });

  it("apagado, el interruptor manda ?atrasados=1 al enviarse: sin JavaScript", () => {
    const pagina = html();

    expect(pagina).toContain('name="atrasados" value="1"');
    expect(pagina).toContain('aria-pressed="false"');
  });

  it("encendido, el interruptor deja de mandar atrasados: el envío lo apaga", () => {
    const pagina = html({ soloAtrasados: true });

    expect(pagina).not.toContain('name="atrasados"');
    expect(pagina).toContain('aria-pressed="true"');
  });
});

/** Los campos ocultos del interruptor salen de la misma URL que los links. */
describe("camposDeLaUrl", () => {
  it("sin filtros no hay campos que conservar", () => {
    expect(camposDeLaUrl({})).toEqual([]);
  });

  it("lleva los filtros y la busqueda, y nunca atrasados", () => {
    const filtros = {
      estado: "RECIBIDO" as const,
      tipo: "BACHE" as const,
      area: "OBRAS_PUBLICAS" as const,
      lugar: "11111111-1111-4111-8111-111111111111",
    };

    expect(
      camposDeLaUrl({ filtros, q: "calle 26", soloAtrasados: true }),
    ).toEqual([
      ...Object.entries(filtros).map(([nombre, valor]) => ({ nombre, valor })),
      { nombre: "q", valor: "calle 26" },
    ]);
  });
});

describe("hrefDeEstado: la URL de cada pestaña", () => {
  const LUGAR = "11111111-1111-4111-8111-111111111111";
  const conFiltros = {
    filtros: {
      estado: "RECIBIDO" as const,
      tipo: "BACHE" as const,
      lugar: LUGAR,
    },
    q: "calle",
    soloAtrasados: true,
    orden: { campo: "folio" as const, direccion: "desc" as const },
    limite: TAMANO_DE_PAGINA * 2,
  };

  it("conserva los otros filtros, la busqueda y el atraso, sin orden ni limite", () => {
    const esperado = `/reportes?estado=RESUELTO&tipo=BACHE&lugar=${LUGAR}&q=calle&atrasados=1`;

    expect(hrefDeEstado(conFiltros, "RESUELTO")).toBe(esperado);
    expect(hrefDeEstado(conFiltros, "RESUELTO")).not.toContain("ordenar");
  });

  it("«Todos» suelta el estado y deja el resto", () => {
    expect(
      hrefDeEstado(
        { filtros: { estado: "RECIBIDO", area: "OBRAS_PUBLICAS" } },
        undefined,
      ),
    ).toBe("/reportes?area=OBRAS_PUBLICAS");
  });
});
