import { describe, expect, it } from "vitest";
import { trasladosDeLaPeticion } from "./proxyTraslados";

const K = "11111111-1111-4111-8111-111111111111";
const A = "33333333-3333-4333-8333-333333333333";
const CLAVE = JSON.stringify({
  token: K,
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga-123",
});
const AVISO = JSON.stringify({
  token: A,
  usuarioId: "44444444-4444-4444-8444-444444444444",
});

const traslados = (o: {
  metodo?: string;
  ruta?: string;
  consulta?: string;
  cookie?: string;
}) =>
  trasladosDeLaPeticion({
    metodo: o.metodo ?? "GET",
    ruta: o.ruta ?? "/usuarios",
    consulta: new URLSearchParams(o.consulta ?? ""),
    leerCookie: () => o.cookie,
    esPayload: false,
  });

describe("el traslado de un solo uso (S9, S13 y S14 de usuarios-ux)", () => {
  it("un POST no consume la clave ni el aviso", () => {
    expect(
      traslados({ metodo: "POST", consulta: `clave=${K}`, cookie: CLAVE }),
    ).toEqual([]);
    expect(
      traslados({ metodo: "POST", consulta: `aviso=${A}`, cookie: AVISO }),
    ).toEqual([]);
  });

  it("solo el GET de /usuarios consume la clave", () => {
    expect(
      traslados({
        ruta: "/usuarios/alta",
        consulta: `clave=${K}`,
        cookie: CLAVE,
      }),
    ).toEqual([]);
    expect(traslados({ consulta: `clave=${K}`, cookie: CLAVE })).toHaveLength(
      1,
    );
  });

  it("un token ajeno o una peticion sin cookie no trasladan nada", () => {
    expect(traslados({ consulta: `aviso=${K}`, cookie: AVISO })).toEqual([]);
    expect(traslados({ consulta: `clave=${K}` })).toEqual([]);
  });

  it("sin token en la URL la cookie sobrevive y nada se anuncia", () => {
    expect(traslados({ cookie: AVISO })).toEqual([]);
  });
});
