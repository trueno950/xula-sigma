import { describe, expect, it } from "vitest";
import {
  type BorradorDeDomicilio,
  camposDelFormulario,
  camposPara,
  codificarBorrador,
  decodificarBorrador,
} from "./borradorDeDomicilio";

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DOMICILIO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTRO_DOMICILIO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const campos = {
  calleId: "33333333-3333-4333-8333-333333333333",
  zonaId: "sin-colonia",
  numero: "17-A",
  entreCalleAId: "",
  entreCalleBId: "",
  referencia: "Portón azul",
};

const borrador: BorradorDeDomicilio = {
  token: TOKEN,
  destino: { formulario: "alta" },
  campos,
};

const formulario = (valores: Record<string, string>) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(valores)) datos.set(clave, valor);
  return datos;
};

describe("borrador de domicilio: codificacion", () => {
  it("lo codificado se lee igual", () => {
    expect(decodificarBorrador(codificarBorrador(borrador))).toEqual(borrador);
  });

  it("un valor que no es JSON se ignora", () => {
    expect(decodificarBorrador("{no es json")).toBeNull();
    expect(decodificarBorrador(undefined)).toBeNull();
  });

  it("un JSON con otra forma se ignora", () => {
    const alterado = JSON.stringify({ ...borrador, token: "no-es-uuid" });

    expect(decodificarBorrador(alterado)).toBeNull();
    expect(decodificarBorrador(JSON.stringify([1, 2]))).toBeNull();
  });

  it("descarta los campos que no son del formulario, como un tenant", () => {
    const conExtra = JSON.stringify({
      ...borrador,
      ayuntamientoId: "motul",
      campos: { ...campos, ayuntamientoId: "motul" },
    });

    expect(decodificarBorrador(conExtra)).toEqual(borrador);
  });

  it("un campo mas largo que el limite se ignora", () => {
    const largo = JSON.stringify({
      ...borrador,
      campos: { ...campos, referencia: "x".repeat(5000) },
    });

    expect(decodificarBorrador(largo)).toBeNull();
  });
});

describe("borrador de domicilio: lo que se guarda del formulario", () => {
  it("lee los campos del alta, con la colonia de `lugarId`", () => {
    const leidos = camposDelFormulario(
      formulario({ ...campos, lugarId: "sin-colonia", zonaId: "ignorada" }),
      "lugarId",
    );

    expect(leidos).toEqual(campos);
  });

  it("recorta lo capturado para que la cookie quepa en el navegador", () => {
    const enorme = "ñ".repeat(10_000);
    const leidos = camposDelFormulario(
      formulario({
        calleId: enorme,
        zonaId: enorme,
        numero: enorme,
        entreCalleAId: enorme,
        entreCalleBId: enorme,
        referencia: enorme,
      }),
      "zonaId",
    );
    const valor = codificarBorrador({ ...borrador, campos: leidos });

    expect(encodeURIComponent(valor).length).toBeLessThan(4096);
    expect(decodificarBorrador(valor)?.campos).toEqual(leidos);
  });
});

describe("borrador de domicilio: solo rellena el formulario del que salio", () => {
  const correccion: BorradorDeDomicilio = {
    ...borrador,
    destino: { formulario: "correccion", domicilioId: DOMICILIO },
  };

  it("el del alta rellena el alta y no una correccion", () => {
    expect(camposPara(borrador, { formulario: "alta" })).toEqual(campos);
    expect(
      camposPara(borrador, {
        formulario: "correccion",
        domicilioId: DOMICILIO,
      }),
    ).toBeUndefined();
  });

  it("el de una correccion rellena solo la de ese domicilio", () => {
    expect(
      camposPara(correccion, {
        formulario: "correccion",
        domicilioId: DOMICILIO,
      }),
    ).toEqual(campos);
    expect(
      camposPara(correccion, {
        formulario: "correccion",
        domicilioId: OTRO_DOMICILIO,
      }),
    ).toBeUndefined();
    expect(camposPara(correccion, { formulario: "alta" })).toBeUndefined();
  });

  it("sin borrador no rellena nada", () => {
    expect(camposPara(undefined, { formulario: "alta" })).toBeUndefined();
  });
});
