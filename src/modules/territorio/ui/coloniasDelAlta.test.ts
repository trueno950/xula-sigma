import { describe, expect, it } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import { asentamientosDeCalles, coloniasAOfrecer } from "./coloniasDelAlta";
import type { LugarConPadre } from "./vistaDeDomicilios";
import { zonaDelFormulario } from "./zonaDelFormulario";

const motulId = comoLugarId("11111111-1111-4111-8111-111111111111");
const kiniId = comoLugarId("22222222-2222-4222-8222-222222222222");
const sanPedroId = comoLugarId("33333333-3333-4333-8333-333333333333");
const centroId = comoLugarId("44444444-4444-4444-8444-444444444444");
const pabloId = comoLugarId("55555555-5555-4555-8555-555555555555");

const municipio: readonly LugarConPadre[] = [
  { id: motulId, tipo: "cabecera", nombre: "Motul", padreId: null },
  { id: kiniId, tipo: "comisaria", nombre: "Kiní", padreId: null },
  { id: sanPedroId, tipo: "comisaria", nombre: "San Pedro", padreId: null },
  { id: centroId, tipo: "colonia", nombre: "Centro", padreId: motulId },
  { id: pabloId, tipo: "colonia", nombre: "Pablo", padreId: sanPedroId },
];

const entrada = zonaDelFormulario(municipio, undefined, undefined);
const motul = { id: motulId, nombre: "Motul" };
const kini = { id: kiniId, nombre: "Kiní" };

describe("coloniasAOfrecer", () => {
  it("sin calle elegida agrupa las colonias por asentamiento", () => {
    const oferta = coloniasAOfrecer(entrada, undefined);

    expect(oferta.forma).toBe("grupos");
    if (oferta.forma !== "grupos") return;
    expect(
      oferta.grupos.map((grupo) => [
        grupo.asentamiento.nombre,
        grupo.opciones.map((opcion) => opcion.valor),
      ]),
    ).toEqual([
      ["Motul", [centroId]],
      ["San Pedro", [pabloId]],
    ]);
  });

  it("con la calle elegida ofrece solo las colonias de su asentamiento", () => {
    expect(coloniasAOfrecer(entrada, motul)).toEqual({
      forma: "lista",
      opciones: [{ valor: centroId, etiqueta: "Centro — Motul" }],
    });
  });

  it("un asentamiento sin colonias no ofrece lista: lo dice en una linea", () => {
    expect(coloniasAOfrecer(entrada, kini)).toEqual({
      forma: "ninguna",
      mensaje: "Kiní no tiene colonias; el domicilio queda en Kiní.",
    });
  });

  it("con un solo asentamiento con colonias la lista va sin grupos", () => {
    const subarbolDeMotul = municipio.filter((lugar) =>
      [motulId, centroId].includes(lugar.id),
    );
    const zona = zonaDelFormulario(subarbolDeMotul, motul, undefined);

    expect(coloniasAOfrecer(zona, undefined)).toEqual({
      forma: "lista",
      opciones: [{ valor: centroId, etiqueta: "Centro — Motul" }],
    });
  });

  it("sin colonias en el alcance no hay lista que ofrecer", () => {
    const zona = zonaDelFormulario(
      municipio.filter((lugar) => lugar.id === kiniId),
      kini,
      undefined,
    );

    expect(coloniasAOfrecer(zona, undefined)).toEqual({
      forma: "ninguna",
      mensaje: "Kiní no tiene colonias; el domicilio queda en Kiní.",
    });
  });
});

describe("asentamientosDeCalles", () => {
  it("lleva cada calle a su asentamiento, con su nombre", () => {
    const calle = comoCalleId("66666666-6666-4666-8666-666666666666");

    expect(
      asentamientosDeCalles([
        {
          id: calle,
          nombre: "Calle 14",
          lugarId: kiniId,
          punto: null,
          bajaEn: null,
          asentamiento: "Kiní",
        },
      ]),
    ).toEqual({ [calle]: kini });
  });
});
