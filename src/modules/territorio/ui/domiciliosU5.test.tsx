import { describe, expect, it } from "vitest";
import {
  cabeceraId,
  enManzanaId,
  manzanaId,
  render,
  seleccionado,
} from "./fixturasDeDomiciliosU5";

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
    const html = render();

    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${manzanaId}&amp;vista=domicilios&amp;domicilio=${enManzanaId}#panel-de-domicilio"`,
    );
  });
});

describe("tab de domicilios: el lugar de cada fila", () => {
  it("no hay columna Lugar: el contexto ya lo da la cabecera", () => {
    expect(render()).not.toContain(">Lugar<");
  });

  it("nombra el lugar solo bajo el domicilio de otro lugar del subarbol", () => {
    const filas = render().split("<li");
    const deLaColonia = filas.find((fila) => fila.includes("Calle 21 21"));
    const deLaManzana = filas.find((fila) => fila.includes("Calle 30"));

    expect(deLaManzana).toContain("Manzana 1");
    expect(deLaColonia).not.toContain("Centro");
  });

  it("la direccion sin numero se lee como sin numero", () => {
    expect(render()).toContain("Calle 30 sin número");
    expect(render()).not.toContain("S/N");
  });
});
