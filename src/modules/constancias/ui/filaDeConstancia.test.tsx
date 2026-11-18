import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConstanciaGuardada } from "../application/puertos";
import { FilaDeConstancia } from "./FilaDeConstancia";

/**
 * `emitidaEn` es el instante real de emision: `24 oct 2026` a las 18:00 UTC
 * ya es el dia siguiente en Merida, asi que la fecha que se afirma abajo es
 * la del calendario local.
 */
const constancia = (
  parcial: Partial<ConstanciaGuardada> = {},
): ConstanciaGuardada =>
  ({
    id: "11111111-1111-4111-8111-111111111111",
    folio: "VEC-2026-000018",
    emitidaEn: new Date("2026-10-24T18:00:00Z"),
    canceladaEn: null,
    nombreDelTitular: "Canul Dzul, Wilberth Antonio",
    estado: "VIGENTE",
    ...parcial,
  }) as ConstanciaGuardada;

const html = (parcial: Partial<ConstanciaGuardada> = {}) =>
  renderToStaticMarkup(<FilaDeConstancia constancia={constancia(parcial)} />);

describe("FilaDeConstancia, a quién se le emitió (S1)", () => {
  it("la fila dice el folio y el nombre del titular", () => {
    const fila = html();

    expect(fila).toContain("VEC-2026-000018");
    expect(fila).toContain("Canul Dzul, Wilberth Antonio");
  });

  it("la fila entera entra al detalle y su nombre accesible nombra al titular", () => {
    expect(html()).toContain(
      'href="/constancias/11111111-1111-4111-8111-111111111111"',
    );
    expect(html()).toContain(
      'aria-label="Abrir la constancia VEC-2026-000018 de Canul Dzul, Wilberth Antonio, Vigente"',
    );
  });
});

describe("FilaDeConstancia, el estado de la fila", () => {
  it("vigente lleva insignia de exito con icono y palabra", () => {
    expect(html()).toMatch(
      /bg-senial-exito-suave[^>]*><svg[^>]*>.*<\/svg>Vigente</,
    );
  });

  it("cancelada lleva insignia de error con icono y palabra", () => {
    expect(
      html({
        canceladaEn: new Date("2026-10-26T18:00:00Z"),
        estado: "CANCELADA",
      }),
    ).toMatch(/bg-senial-error-suave[^>]*><svg[^>]*>.*<\/svg>Cancelada</);
  });
});

describe("FilaDeConstancia, la fecha de emisión", () => {
  it("se lee como fecha civil en Mérida, no en UTC", () => {
    expect(html()).toContain("24 oct 2026");
  });
});

describe("FilaDeConstancia, los tres renglones del teléfono", () => {
  it("el estado acompaña al folio, y el titular y la fecha van debajo", () => {
    // El `aria-label` de la fila nombra los tres datos por delante de las
    // celdas; el orden que se afirma es el de las celdas pintadas.
    const fila = html().replace(/aria-label="[^"]*"/, "");

    expect(fila.indexOf("VEC-2026-000018")).toBeLessThan(
      fila.indexOf("Vigente"),
    );
    expect(fila.indexOf("Vigente")).toBeLessThan(
      fila.indexOf("Canul Dzul, Wilberth Antonio"),
    );
    expect(fila.indexOf("Canul Dzul, Wilberth Antonio")).toBeLessThan(
      fila.indexOf("24 oct 2026"),
    );
  });

  it("folio y estado comparten contenedor, que en escritorio se disuelve en columnas", () => {
    const fila = html().replace(/aria-label="[^"]*"/, "");
    const desdeElGrupo = fila.slice(fila.indexOf("sm:contents"));

    expect(fila).toContain("sm:contents");
    expect(desdeElGrupo.indexOf("Vigente")).toBeLessThan(
      desdeElGrupo.indexOf("Canul Dzul, Wilberth Antonio"),
    );
  });
});
