import { describe, expect, it } from "vitest";
import type { PropsDeContenido } from "./contenido";
import {
  cabeceraId,
  enOtraColoniaId,
  otraColoniaId,
  render,
  seleccionado,
} from "./fixturasDeDomiciliosU5";

/**
 * El nodo abierto es el asentamiento: es el unico lugar cuyo subarbol
 * contiene a las dos colonias, y por lo tanto el unico desde el que se ve
 * una fila de cada una con el arbol de dos niveles.
 */
const conAsentamientoAbierto = (resto: Partial<PropsDeContenido> = {}) =>
  render({
    lugar: { id: cabeceraId, tipo: "cabecera", nombre: "Tepakan" },
    ...resto,
  });

describe("tab de domicilios: fila seleccionada", () => {
  it("marca solo la fila del domicilio abierto con aria-current", () => {
    const html = seleccionado();

    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(
      /aria-label="Calle 21 21[^"]*"[^>]*aria-current="true"/,
    );
  });

  it("sin seleccion ninguna fila queda marcada", () => {
    expect(render()).not.toContain("aria-current");
  });

  it("cada fila enlaza al panel de su domicilio con el fragmento", () => {
    const html = conAsentamientoAbierto();

    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${otraColoniaId}&amp;vista=domicilios&amp;domicilio=${enOtraColoniaId}#panel-de-domicilio"`,
    );
  });
});

describe("tab de domicilios: el lugar de cada fila", () => {
  it("no hay columna Lugar: el contexto ya lo da la cabecera", () => {
    expect(render()).not.toContain(">Lugar<");
  });

  it("no repite el nombre de la colonia abierta en sus propias filas", () => {
    const filas = render().split("<li");
    const deLaColonia = filas.find((fila) => fila.includes("Calle 21 21"));

    expect(deLaColonia).not.toContain("Centro");
  });

  it("nombra la colonia de cada domicilio cuando el nodo abierto es el asentamiento", () => {
    const filas = conAsentamientoAbierto().split("<li");
    const deCentro = filas.find((fila) => fila.includes("Calle 21 21"));
    const deNorte = filas.find((fila) => fila.includes("Calle 30"));

    expect(deCentro).toContain("Centro");
    expect(deNorte).toContain("Norte");
  });

  it("la direccion sin numero se lee como sin numero", () => {
    expect(conAsentamientoAbierto()).toContain("Calle 30 sin número");
    expect(conAsentamientoAbierto()).not.toContain("S/N");
  });
});
