import { describe, expect, it } from "vitest";
import {
  borradorDelFormulario,
  decodificarBorrador,
} from "./borradorDeIntervencion";

const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";

const formulario = (valores: Record<string, string>) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(valores)) datos.set(clave, valor);
  return datos;
};

const CAPTURADO = {
  tipo: "BACHE",
  lugarId: LUGAR,
  calleId: CALLE,
  fechaDeOcurrencia: "2026-11-16",
  descripcion: "Bache rellenado frente al parque",
};

describe("borrador del alta de intervención", () => {
  it("guarda lo capturado tal cual, con un token propio", () => {
    const borrador = borradorDelFormulario(formulario(CAPTURADO));

    expect(borrador.campos).toEqual(CAPTURADO);
    expect(borrador.token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("acepta el alta sin calle", () => {
    const borrador = borradorDelFormulario(
      formulario({ ...CAPTURADO, calleId: "" }),
    );

    expect(borrador.campos.calleId).toBe("");
  });

  /** El techo de la cookie: el formulario ya acota la descripción a 1000. */
  it("recorta una descripción más larga que el techo de la cookie", () => {
    const borrador = borradorDelFormulario(
      formulario({ ...CAPTURADO, descripcion: "a".repeat(1001) }),
    );

    expect(borrador.campos.descripcion).toHaveLength(1000);
  });

  it("la cookie la reescribe el navegador: lo que no tiene esta forma se ignora", () => {
    expect(decodificarBorrador(undefined)).toBeNull();
    expect(decodificarBorrador("no es json")).toBeNull();
    expect(decodificarBorrador('{"token":"x"}')).toBeNull();
  });
});
