import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DetalleDeCalle } from "../application/puertosDeDetallesDeCalles";
import { comoCalleId, comoLugarId, type PuntoGeografico } from "../domain";
import { ListaDeCalles } from "./ListaDeCalles";
import { paginaDeCalles } from "./paginaDeCalles";

vi.mock("./actions/renombrarCalleAction", () => ({
  renombrarCalleAction: vi.fn(),
}));
vi.mock("./actions/ubicarCalleAction", () => ({ ubicarCalleAction: vi.fn() }));
vi.mock("./actions/reparentearCalleAction", () => ({
  reparentearCalleAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaCalleAction", () => ({
  darDeBajaCalleAction: vi.fn(),
}));

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const punto: PuntoGeografico = { latitud: 20.1, longitud: -89.1 };

const lugar = { id: raizId, tipo: "cabecera" as const, nombre: "Buenavista" };

const calle = (n: number, nombre: string) => ({
  id: comoCalleId(`3333333${n}-3333-4333-8333-333333333333`),
  nombre,
  lugarId: raizId,
  punto,
});

const deLaColonia = calle(1, "Calle 20 de la Colonia");
const calle20 = calle(2, "Calle 20");
const calle22 = calle(3, "Calle 22");

const CATALOGO = [
  deLaColonia,
  calle20,
  calle22,
  calle(4, "Calle 24"),
  calle(5, "Calle 15"),
  calle(6, "Camino a Sisal"),
];

const DETALLES: readonly DetalleDeCalle[] = [
  { calleId: deLaColonia.id, zona: "Sector Norte", domicilios: 2 },
  { calleId: calle20.id, zona: "Sector Norte", domicilios: 2 },
  { calleId: calle22.id, zona: null, domicilios: 0 },
];

const render = (resto: Partial<Parameters<typeof ListaDeCalles>[0]> = {}) => {
  const pagina = paginaDeCalles(CATALOGO, resto);
  return renderToStaticMarkup(
    <ListaDeCalles
      raizId={raizId}
      lugar={lugar}
      calles={pagina.filas}
      hayMas={pagina.hayMas}
      coincidencias={pagina.coincidencias}
      calleId={undefined}
      busqueda={resto.busqueda}
      limite={resto.limite}
      detalles={resto.detalles}
    />,
  );
};

/** El texto visible, sin etiquetas: la frase se lee entera. */
const textoDe = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** S4 de `territorio-ux`: la pestana sigue diciendo el total; la linea no. */
describe("la linea de conteo de la pestana Calles", () => {
  it("sin busqueda dice cuantas calles tiene el asentamiento", () => {
    expect(textoDe(render())).toContain("6 calles");
  });

  it("con busqueda dice cuantas coincidieron y nombra la busqueda", () => {
    expect(textoDe(render({ busqueda: "20" }))).toContain("2 calles para «20»");
  });

  it("con busqueda ofrece el chip que la quita, a la ruta sin `q`", () => {
    const html = render({ busqueda: "20" });

    expect(html).toContain("Búsqueda: 20");
    expect(html).toContain(
      `href="/territorio?raiz=${raizId}&amp;nodo=${raizId}&amp;vista=calles"`,
    );
  });

  it("sin busqueda no hay chip que quitar", () => {
    expect(render()).not.toContain("Quitar filtro");
  });
});

/** S8 de `territorio-ux`: zona y domicilios como columnas de la tabla. */
describe("las columnas de zona y domicilios", () => {
  it("nombra la zona de cada calle, y escribe «Sin zona» cuando no tiene", () => {
    const html = render({ detalles: DETALLES });

    expect(html).toContain(">Zona<");
    expect(html).toContain(">Domicilios<");
    expect(html).toContain("Sector Norte");
    expect(html).toContain("Sin zona");
  });

  it("cuenta los domicilios de cada calle", () => {
    const texto = textoDe(render({ detalles: DETALLES }));

    expect(texto).toContain("Calle 20 de la Colonia Sector Norte 2");
    expect(texto).toContain("Calle 22 Sin zona 0");
  });

  it("sin la lectura de detalles no inventa las columnas", () => {
    const html = render();

    expect(html).not.toContain(">Zona<");
    expect(html).not.toContain("Sin zona");
  });

  /**
   * En el telefono la fila se parte en dos renglones -nombre arriba, apoyo
   * abajo- y el enlace cubre la fila entera: la zona y la cuenta no pueden
   * quedar fuera del clic ni empujar un tercer renglon.
   */
  it("la fila entera es un enlace que incluye zona y domicilios", () => {
    const html = render({ detalles: DETALLES });
    const desde = html.indexOf('aria-label="Calle 20 de la Colonia');
    const fila = html.slice(desde, html.indexOf("</a>", desde));

    expect(fila).toContain("Calle 20 de la Colonia");
    expect(fila).toContain("Sector Norte");
    expect(fila).toContain("Ubicada");
  });
});
