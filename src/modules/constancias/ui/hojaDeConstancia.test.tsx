import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  type DatosDeLaHojaDeConstancia,
  HojaDeConstancia,
} from "./HojaDeConstancia";

const DATOS: DatosDeLaHojaDeConstancia = {
  municipio: "H. Ayuntamiento de Motul",
  titular: { nombreCompleto: "Guadalupe Kumul Poot" },
  direccion: {
    texto: "Calle 20 101, Colonia Centro, Motul",
    desdeEn: "2026-10-01",
  },
  firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
};

const pintar = (datos: Partial<DatosDeLaHojaDeConstancia> = {}) =>
  renderToStaticMarkup(<HojaDeConstancia datos={{ ...DATOS, ...datos }} />);

/**
 * S5 de `constancias-ux`: esta hoja es la vista previa de la emision y, con
 * el sello del estado, la hoja del detalle. Existe una sola para que las dos
 * pantallas no puedan decir cosas distintas del mismo documento.
 */
describe("HojaDeConstancia", () => {
  it("lleva el membrete del municipio y el titulo del documento", () => {
    const html = pintar();

    expect(html).toContain("H. Ayuntamiento de Motul");
    expect(html).toContain("Constancia de vecindad");
  });

  /**
   * La redaccion es la de la plantilla del PDF
   * (`ConstanciaDeVecindadV1.tsx`): es lo que se imprime, asi que una
   * variante en pantalla seria una promesa que el papel no cumple.
   */
  it("dice el texto de la plantilla, con titular, domicilio y fecha larga", () => {
    const html = pintar();

    expect(html).toContain("Quien suscribe hace constar que");
    expect(html).toContain("es vecino(a) de este municipio, con domicilio en");
    expect(html).toContain("Guadalupe Kumul Poot");
    expect(html).toContain("Calle 20 101, Colonia Centro, Motul");
    expect(html).toContain("1 de octubre de 2026");
    expect(html).toContain(
      "Se expide la presente constancia a petición de la parte interesada",
    );
  });

  it("muestra el bloque de firma de quien suscribe", () => {
    const html = pintar();

    expect(html).toContain("Maria Poot");
    expect(html).toContain("Secretaria Municipal");
  });

  it("la leyenda de pie solo aparece si el ayuntamiento la configuro", () => {
    expect(pintar()).not.toContain("Documento gratuito");
    expect(
      pintar({
        firmante: {
          nombre: "Maria Poot",
          cargo: "Secretaria Municipal",
          leyendaDePie: "Documento gratuito",
        },
      }),
    ).toContain("Documento gratuito");
  });

  it("muestra «Reside desde» en fecha corta", () => {
    const html = pintar();

    expect(html).toContain("Reside desde");
    expect(html).toContain("1 oct 2026");
  });

  /**
   * El folio no existe antes de emitir: en la vista previa de la emision no
   * hay numero que mostrar, y en el detalle si. Es la unica diferencia entre
   * las dos hojas.
   */
  it("sin folio no inventa un numero de folio", () => {
    expect(pintar()).not.toContain("Folio");
    expect(pintar({ folio: "VEC-2026-000003" })).toContain(
      "Folio VEC-2026-000003",
    );
  });

  it("la fecha de emision solo aparece si la constancia ya se emitio", () => {
    expect(pintar()).not.toContain("Emitida");

    const html = pintar({ emitidaEn: new Date("2026-10-15T23:27:00-06:00") });

    expect(html).toContain("Emitida");
    expect(html).toContain("15 oct 2026");
  });

  it("el nombre del titular enlaza a su ficha cuando el detalle lo pide", () => {
    const html = pintar({
      titular: { nombreCompleto: "Guadalupe Kumul Poot", href: "/padron/p-1" },
    });

    expect(html).toContain('href="/padron/p-1"');
  });

  /** El sello del estado lo pone el detalle (S7); la hoja solo le abre el lugar. */
  it("recibe el sello del estado como slot", () => {
    const html = renderToStaticMarkup(
      <HojaDeConstancia datos={DATOS} sello={<span>Vigente</span>} />,
    );

    expect(html).toContain("Vigente");
  });
});
