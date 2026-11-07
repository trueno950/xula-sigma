import { describe, expect, it } from "vitest";
import { TAMANO_DE_PAGINA } from "../application/registroDeDomicilios";
import { paginaDeCalles } from "./paginaDeCalles";

const calle = (nombre: string) => ({ nombre });
const muchas = Array.from({ length: TAMANO_DE_PAGINA + 5 }, (_, i) =>
  calle(`Calle ${i + 1}`),
);

describe("paginaDeCalles", () => {
  it("sin limite muestra la primera pagina y avisa que hay mas", () => {
    const pagina = paginaDeCalles(muchas, {});

    expect(pagina.filas).toHaveLength(TAMANO_DE_PAGINA);
    expect(pagina.hayMas).toBe(true);
  });

  it("con el limite ampliado muestra todas y deja de ofrecer mas", () => {
    const pagina = paginaDeCalles(muchas, { limite: TAMANO_DE_PAGINA * 2 });

    expect(pagina.filas).toHaveLength(TAMANO_DE_PAGINA + 5);
    expect(pagina.hayMas).toBe(false);
  });

  it("la busqueda filtra por nombre sin mayusculas ni acentos", () => {
    const calles = [calle("Calle Álamo"), calle("Calle 20"), calle("ALAMOS")];

    expect(paginaDeCalles(calles, { busqueda: "alamo" }).filas).toEqual([
      calle("Calle Álamo"),
      calle("ALAMOS"),
    ]);
  });

  it("la busqueda se pagina sobre lo que coincide, no sobre todo el catalogo", () => {
    const pagina = paginaDeCalles(muchas, { busqueda: "Calle 5" });

    expect(pagina.filas.map((c) => c.nombre)).toEqual([
      "Calle 5",
      "Calle 50",
      "Calle 51",
      "Calle 52",
      "Calle 53",
      "Calle 54",
      "Calle 55",
    ]);
    expect(pagina.hayMas).toBe(false);
  });
});
