import { describe, expect, it } from "vitest";
import {
  enlaceDeAltaDesdeFicha,
  esquemaDeRegreso,
  regresoConDomicilioCreado,
} from "./regresoAFicha";

const PERSONA = "11111111-1111-4111-8111-111111111111";

describe("esquemaDeRegreso", () => {
  it("acepta solo la ficha de una persona del padron", () => {
    expect(esquemaDeRegreso.safeParse(`/padron/${PERSONA}`).success).toBe(true);
  });

  it.each([
    ["una URL absoluta", `https://evil.example/padron/${PERSONA}`],
    ["una URL sin esquema", `//evil.example/padron/${PERSONA}`],
    ["un salto de directorio", "/padron/../territorio"],
    ["otra pantalla", "/territorio"],
    ["el listado del padron", "/padron"],
    ["un id que no es uuid", "/padron/abc"],
    ["una consulta colgada", `/padron/${PERSONA}?ok=x`],
    ["un tramo de mas", `/padron/${PERSONA}/x`],
  ])("rechaza %s", (_caso, destino) => {
    expect(esquemaDeRegreso.safeParse(destino).success).toBe(false);
  });
});

describe("enlaceDeAltaDesdeFicha", () => {
  it("abre el alta de domicilio de territorio con la ficha como regreso", () => {
    const enlace = new URL(enlaceDeAltaDesdeFicha(PERSONA), "http://x");

    expect(enlace.pathname).toBe("/territorio");
    expect(enlace.searchParams.get("accion")).toBe("domicilio");
    expect(enlace.searchParams.get("regreso")).toBe(`/padron/${PERSONA}`);
  });
});

describe("regresoConDomicilioCreado", () => {
  it("vuelve a la ficha con el aviso y solo el id del domicilio, nunca la direccion", () => {
    const DOMICILIO = "22222222-2222-4222-8222-222222222222";

    expect(regresoConDomicilioCreado(`/padron/${PERSONA}`, DOMICILIO)).toBe(
      `/padron/${PERSONA}?ok=domicilio-creado&domicilio=${DOMICILIO}`,
    );
  });
});
