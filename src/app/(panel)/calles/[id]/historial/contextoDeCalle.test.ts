import { describe, expect, it } from "vitest";
import { contextoDeCalle } from "./contextoDeCalle";

const lugar = (id: string, nombre: string, padreId: string | null) => ({
  id,
  nombre,
  padreId,
  tipo: "COLONIA",
  bajaEn: null as Date | null,
});

const calle = (lugarId: string, bajaEn: Date | null = null) =>
  ({ id: "calle-1", nombre: "Calle 20", lugarId, bajaEn }) as never;

const lugares = [
  lugar("raiz", "Motul", null),
  lugar("col", "Colonia Centro", "raiz"),
] as never[];

describe("contextoDeCalle", () => {
  it("arma la migaja Territorio > lugares > calle > Historial", () => {
    const { migaja } = contextoDeCalle(calle("col"), lugares);

    expect(migaja.map((p) => p.etiqueta)).toEqual([
      "Territorio",
      "Motul",
      "Colonia Centro",
      "Calle 20",
      "Historial",
    ]);
    expect(migaja.at(-1)?.href).toBeUndefined();
    expect(migaja.at(-2)?.href).toBe(
      "/territorio?raiz=raiz&nodo=col&vista=calles&calle=calle-1",
    );
  });

  it("vuelve a la calle seleccionada en Territorio", () => {
    expect(contextoDeCalle(calle("col"), lugares)).toMatchObject({
      volverHref: "/territorio?raiz=raiz&nodo=col&vista=calles&calle=calle-1",
      volverEtiqueta: "Volver a la calle",
    });
  });

  it("sin cadena de lugares vuelve a /territorio", () => {
    const resultado = contextoDeCalle(calle("perdido"), lugares);

    expect(resultado.volverHref).toBe("/territorio");
    expect(resultado.migaja.map((p) => p.etiqueta)).toEqual([
      "Territorio",
      "Calle 20",
      "Historial",
    ]);
  });

  it("un lugar de baja en la cadena cae a /territorio", () => {
    const conBaja = [
      { ...lugar("raiz", "Motul", null), bajaEn: new Date("2026-01-01") },
      lugar("col", "Colonia Centro", "raiz"),
    ] as never[];

    expect(contextoDeCalle(calle("col"), conBaja).volverHref).toBe(
      "/territorio",
    );
  });

  it("una calle de baja vuelve a su lugar, no a ella", () => {
    const resultado = contextoDeCalle(
      calle("col", new Date("2026-02-01")),
      lugares,
    );

    expect(resultado.volverHref).toBe("/territorio?raiz=raiz&nodo=col");
    expect(resultado.volverEtiqueta).toBe("Volver al lugar");
    expect(resultado.migaja.at(-2)?.href).toBeUndefined();
  });

  it("no se cuelga con un ciclo de padres", () => {
    const ciclo = [lugar("a", "A", "b"), lugar("b", "B", "a")] as never[];

    expect(contextoDeCalle(calle("a"), ciclo).volverHref).toBe("/territorio");
  });

  describe("tope de profundidad de la cadena", () => {
    /** `n` lugares encadenados: `l0` es la raiz y `l{n-1}` el de la calle. */
    const cadenaDe = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        lugar(`l${i}`, `Nivel ${i}`, i === 0 ? null : `l${i - 1}`),
      ) as never[];

    it("una cadena de exactamente 16 arma la migaja completa", () => {
      const resultado = contextoDeCalle(calle("l15"), cadenaDe(16));

      expect(resultado.migaja).toHaveLength(16 + 3);
      expect(resultado.volverHref).toBe(
        "/territorio?raiz=l0&nodo=l15&vista=calles&calle=calle-1",
      );
    });

    it("una de 17 cae a /territorio", () => {
      const resultado = contextoDeCalle(calle("l16"), cadenaDe(17));

      expect(resultado.volverHref).toBe("/territorio");
      expect(resultado.migaja.map((p) => p.etiqueta)).toEqual([
        "Territorio",
        "Calle 20",
        "Historial",
      ]);
    });
  });
});
