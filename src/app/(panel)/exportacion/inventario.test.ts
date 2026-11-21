import { describe, expect, it } from "vitest";
import { porciones } from "@/app/exportacion/porciones";
import { nombresDeConjuntos } from "@/shared/exportacion/inventario";

/**
 * Lo que la pantalla dice de cada conjunto (S10, S11, S14): a que grupo
 * pertenece, que lleva y si trae datos del personal.
 *
 * El pin importante es el primero: la lista sale de las mismas porciones que
 * arma el ZIP, asi que un conjunto nuevo sin texto rompe aca y no aparece en
 * la pantalla como una fila sin explicacion.
 */

const { agruparInventario, totalDeArchivos } = await import("./inventario");

const nombres = nombresDeConjuntos(porciones);
const conjuntos = nombres.map((nombre, indice) => ({
  nombre,
  filas: indice + 1,
}));

describe("agruparInventario", () => {
  it("todo conjunto del ZIP tiene grupo y texto, y ninguno cae en «otros»", () => {
    const grupos = agruparInventario(conjuntos);
    const descritos = grupos.flatMap((grupo) => grupo.conjuntos);

    expect(descritos.map((conjunto) => conjunto.archivo)).toEqual(
      nombres.map((nombre) => `${nombre}.csv`),
    );
    expect(grupos.map((grupo) => grupo.clave)).not.toContain("otros");
    expect(
      grupos
        .flatMap((grupo) => grupo.conjuntos)
        .every((conjunto) => conjunto.lleva.trim().length > 20),
    ).toBe(true);
  });

  it("los seis grupos salen siempre en el mismo orden", () => {
    expect(agruparInventario(conjuntos).map((grupo) => grupo.titulo)).toEqual([
      "Plataforma del ayuntamiento",
      "Padrón",
      "Territorio",
      "Constancias",
      "Reportes",
      "Intervenciones",
    ]);
  });

  it("cada grupo dice cuantos archivos y cuantas filas lleva", () => {
    const plataforma = agruparInventario(conjuntos)[0];

    expect(plataforma?.archivos).toBe(2);
    // `usuarios` va primero (1 fila) y `bitacora` despues (2 filas).
    expect(plataforma?.filas).toBe(3);
  });

  it("solo usuarios.csv lleva la marca de datos del personal", () => {
    const conMarca = agruparInventario(conjuntos)
      .flatMap((grupo) => grupo.conjuntos)
      .filter((conjunto) => conjunto.llevaDatosDelPersonal);

    expect(conMarca.map((conjunto) => conjunto.archivo)).toEqual([
      "usuarios.csv",
    ]);
  });

  /**
   * Un conjunto que nadie describio todavia no puede tumbar la pantalla ni
   * desaparecer de la lista: cae en «otros» con un texto que no promete nada.
   * El test de arriba es el que impide que eso pase en `main`.
   */
  it("un conjunto sin texto cae en «otros» y no se pierde", () => {
    const grupos = agruparInventario([{ nombre: "apoyos", filas: 4 }]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.clave).toBe("otros");
    expect(grupos[0]?.conjuntos[0]?.archivo).toBe("apoyos.csv");
    expect(grupos[0]?.conjuntos[0]?.filas).toBe(4);
  });

  it("el inventario vacio no inventa grupos", () => {
    expect(agruparInventario([])).toEqual([]);
  });
});

describe("totalDeArchivos", () => {
  it("suma el manifiesto y, si hay escudo, su archivo", () => {
    const grupos = agruparInventario(conjuntos);

    expect(totalDeArchivos(grupos, false)).toBe(nombres.length + 1);
    expect(totalDeArchivos(grupos, true)).toBe(nombres.length + 2);
  });
});
