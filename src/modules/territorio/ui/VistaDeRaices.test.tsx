import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { comoLugarId } from "../domain";
import type { LugarDelArbol } from "./arbolDeLugares";
import { VistaDeRaices } from "./VistaDeRaices";

const id = (n: number) =>
  comoLugarId(`${n}${n}${n}${n}${n}${n}${n}${n}-1111-4111-8111-111111111111`);

const lugar = ({
  n,
  nombre,
  tipo,
  padre,
}: {
  n: number;
  nombre: string;
  tipo: LugarDelArbol["tipo"];
  padre?: number;
}): LugarDelArbol => ({
  id: id(n),
  nombre,
  tipo,
  padreId: padre ? id(padre) : null,
});

const cabecera = lugar({ n: 1, nombre: "Buenavista", tipo: "cabecera" });
const centro = lugar({
  n: 2,
  nombre: "Colonia Centro",
  tipo: "colonia",
  padre: 1,
});
const sector = lugar({
  n: 3,
  nombre: "Sector Único",
  tipo: "sector",
  padre: 2,
});
const manzana = lugar({ n: 4, nombre: "Manzana 7", tipo: "manzana", padre: 3 });
const comisaria = lugar({ n: 5, nombre: "Dzununcan", tipo: "comisaria" });
const todos = [cabecera, centro, sector, manzana, comisaria];

const cuentas: ConteoDeLugar[] = [
  { lugarId: cabecera.id, domicilios: 12, calles: 6 },
  { lugarId: centro.id, domicilios: 1, calles: null },
  { lugarId: sector.id, domicilios: 0, calles: null },
  { lugarId: comisaria.id, domicilios: 0, calles: 0 },
];

const pintar = (resto: { busqueda?: string; sinCuentas?: boolean } = {}) =>
  renderToStaticMarkup(
    <VistaDeRaices
      raices={[cabecera, comisaria]}
      lugares={todos}
      cuentas={resto.sinCuentas ? undefined : cuentas}
      busqueda={resto.busqueda}
      hayCabecera
      puedeEscribir
      altaAbierta={false}
    />,
  );

describe("VistaDeRaices: cuentas por fila", () => {
  it("muestra domicilios y calles con singular y plural", () => {
    const html = pintar();

    expect(html).toContain("12 domicilios");
    expect(html).toContain("6 calles");
    expect(html).toContain("1 domicilio<");
  });

  it("la insignia Sin calles solo aparece en lugares con catalogo y cero calles", () => {
    const html = pintar();

    expect(html.match(/Sin calles/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("0 calles");
  });

  it("sin cuentas dibuja las filas sin conteos ni insignias", () => {
    const html = pintar({ sinCuentas: true });

    expect(html).not.toContain("domicilio");
    expect(html).not.toContain("Sin calles");
    expect(html).toContain("Buenavista");
  });
});

describe("VistaDeRaices: arbol colapsable", () => {
  it("abre el primer nivel y deja cerrados los de mas adentro", () => {
    const html = pintar();

    expect(html).toContain("<details open");
    expect(html.match(/<details open/g) ?? []).toHaveLength(1);
    expect(html.match(/<details/g) ?? []).toHaveLength(2);
  });

  it("cada resumen lleva el icono del chevron y una palabra", () => {
    const html = pintar();

    expect(html).toContain("<summary");
    expect(html).toContain("Ocultar");
    expect(html).toContain("Mostrar");
  });

  it("el nombre sigue siendo un enlace a la vista del lugar", () => {
    const html = pintar();

    expect(html).toContain(`href="/territorio?raiz=${cabecera.id}"`);
    expect(html).toContain(
      `href="/territorio?raiz=${cabecera.id}&amp;nodo=${centro.id}"`,
    );
  });

  it("lo que queda mas adentro del tercer nivel es un enlace real", () => {
    const html = pintar();

    expect(html).toContain("1 lugar más adentro");
    expect(html).toContain(
      `href="/territorio?raiz=${cabecera.id}&amp;nodo=${sector.id}"`,
    );
    expect(html).not.toContain("Manzana 7");
  });

  it("las filas llevan el tipo como pastilla y la fila movil se reordena", () => {
    const html = pintar();

    expect(html).toContain(">Colonia<");
    expect(html).toContain('aria-label="Colonia Centro, colonia"');
    expect(html).not.toContain("overflow-x");
  });
});

describe("VistaDeRaices: busqueda", () => {
  it("el formulario es un GET de q con icono, sin autocompletado vivo", () => {
    const html = pintar();

    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain("Buscar lugar");
  });

  it("filtrada, conserva los ancestros, abre las ramas y muestra el chip", () => {
    const html = pintar({ busqueda: "manzana" });

    expect(html).toContain("Manzana 7");
    expect(html).toContain("Buenavista");
    expect(html).not.toContain("Dzununcan");
    expect(html.match(/<details open/g) ?? []).toHaveLength(3);
    expect(html).toContain("Quitar filtro: Búsqueda: manzana");
    expect(html).toContain('href="/territorio"');
    expect(html).toContain('value="manzana"');
  });

  it("sin coincidencias nombra la busqueda y ofrece quitarla", () => {
    const html = pintar({ busqueda: "zzzz" });

    expect(html).toContain("Sin resultados para");
    expect(html).toContain("zzzz");
    expect(html).toContain("Quitar el filtro");
    expect(html).not.toContain("todavía no tiene asentamientos");
  });
});
