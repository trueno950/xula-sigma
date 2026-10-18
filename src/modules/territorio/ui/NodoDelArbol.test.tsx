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
const colonia = lugar({
  n: 2,
  nombre: "Colonia Centro",
  tipo: "colonia",
  padre: 1,
});
const sector = lugar({ n: 3, nombre: "Sector Uno", tipo: "sector", padre: 2 });
const manzana = lugar({ n: 4, nombre: "Manzana 7", tipo: "manzana", padre: 3 });
const comisaria = lugar({ n: 5, nombre: "Dzununcan", tipo: "comisaria" });
const todos = [cabecera, colonia, sector, manzana, comisaria];

const cuentas: ConteoDeLugar[] = [
  { lugarId: cabecera.id, domicilios: 12, calles: 6 },
  { lugarId: colonia.id, domicilios: 1, calles: null },
];

const pintar = (busqueda?: string) =>
  renderToStaticMarkup(
    <VistaDeRaices
      raices={[cabecera, comisaria]}
      lugares={todos}
      cuentas={cuentas}
      busqueda={busqueda}
      hayCabecera
      puedeEscribir
      altaAbierta={false}
    />,
  );

/** El interior de cada `<summary>`, donde axe encontro el enlace anidado. */
const resumenes = (html: string) =>
  [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map(
    (m) => m[1] ?? "",
  );

describe("NodoDelArbol: el resumen no contiene controles", () => {
  it("solo alterna: no envuelve enlaces ni campos", () => {
    const html = pintar();
    const bloques = resumenes(html);

    expect(bloques.length).toBeGreaterThan(0);
    for (const bloque of bloques) {
      expect(bloque).not.toMatch(/<(a|button|input|select|textarea)\b/);
    }
  });

  it("el alternador es un summary nativo con etiqueta que nombra el lugar", () => {
    const html = pintar();

    expect(html).toContain(
      'aria-label="Mostrar u ocultar el contenido de Buenavista"',
    );
    expect(html).toContain("Mostrar");
    expect(html).toContain("Ocultar");
  });
});

describe("NodoDelArbol: comportamiento que se conserva", () => {
  it("las ramas conservan apertura, conteos y el enlace real al lugar", () => {
    const html = pintar();

    expect(html.match(/<details open/g) ?? []).toHaveLength(1);
    expect(html).toContain("12 domicilios");
    expect(html).toContain("1 domicilio<");
    expect(html).toContain(`href="/territorio?raiz=${cabecera.id}"`);
    expect(html).toContain(
      `href="/territorio?raiz=${cabecera.id}&amp;nodo=${colonia.id}"`,
    );
    expect(html).toContain("1 lugar más adentro");
    expect(html).toContain(
      `href="/territorio?raiz=${cabecera.id}&amp;nodo=${sector.id}"`,
    );
  });

  it("con busqueda abre las ramas que llevan a la coincidencia", () => {
    const html = pintar("manzana");

    expect(html).toContain("Manzana 7");
    expect(html.match(/<details open/g) ?? []).toHaveLength(3);
  });
});

/** Las posiciones donde abre cada `<details>` del marcado. */
const abreDeCadaDetails = (html: string) =>
  [...html.matchAll(/<details\b/g)].map((m) => m.index ?? -1);

/** El `</details>` que cierra el que abre en `abre`, contando los anidados. */
const finDeDetails = (html: string, abre: number) => {
  let profundidad = 0;
  let i = abre + "<details".length;
  while (i < html.length) {
    const subAbre = html.indexOf("<details", i);
    const cierra = html.indexOf("</details>", i);
    if (cierra === -1) return html.length;
    if (subAbre !== -1 && subAbre < cierra) {
      profundidad += 1;
      i = subAbre + "<details".length;
      continue;
    }
    if (profundidad === 0) return cierra;
    profundidad -= 1;
    i = cierra + "</details>".length;
  }
  return html.length;
};

describe("NodoDelArbol: el enlace de la rama vive fuera de su propio details", () => {
  const hrefColonia = `/territorio?raiz=${cabecera.id}&amp;nodo=${colonia.id}`;
  const hrefSector = `/territorio?raiz=${cabecera.id}&amp;nodo=${sector.id}`;

  it("la rama cerrada conserva su enlace fuera del details que la alterna", () => {
    const html = pintar();
    const abreColonia = abreDeCadaDetails(html)[1] ?? -1;

    expect(abreColonia).toBeGreaterThan(0);
    expect(html.indexOf(`href="${hrefColonia}"`)).toBeGreaterThan(-1);
    expect(html.indexOf(`href="${hrefColonia}"`)).toBeLessThan(abreColonia);
  });

  it("lo que cuelga de la rama si queda dentro de su details", () => {
    const html = pintar();
    const abreColonia = abreDeCadaDetails(html)[1] ?? -1;
    const finColonia = finDeDetails(html, abreColonia);

    expect(html.indexOf(`href="${hrefSector}"`)).toBeGreaterThan(abreColonia);
    expect(html.indexOf(`href="${hrefSector}"`)).toBeLessThan(finColonia);
  });
});
