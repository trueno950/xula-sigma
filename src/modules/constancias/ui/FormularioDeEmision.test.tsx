import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VistaPreviaDeConstancia } from "../application/vistaPreviaDeConstancia";

vi.mock("./actions/emitirConstanciaAction", () => ({
  emitirConstanciaAction: "emitir-action",
}));

const { FormularioDeEmision } = await import("./FormularioDeEmision");

const VISTA: VistaPreviaDeConstancia = {
  municipio: "H. Ayuntamiento de Motul",
  titular: { nombreCompleto: "Guadalupe Kumul Poot" },
  direccion: {
    texto: "Calle 20 101, Colonia Centro, Motul",
    desdeEn: "2026-10-01",
  },
  firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
};

const pintar = (vista: Partial<VistaPreviaDeConstancia> = {}) =>
  renderToStaticMarkup(
    <FormularioDeEmision
      personaId="persona-1"
      vista={{ ...VISTA, ...vista }}
    />,
  );

beforeEach(() => {
  vi.useFakeTimers();
  // El 18 de noviembre de 2026, hora de Merida: 18 dias despues del 1 de
  // octubre, que es el ejemplo de S6.
  vi.setSystemTime(new Date("2026-11-18T18:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FormularioDeEmision", () => {
  /** S10: el envio sigue siendo el POST nativo de la Server Action. */
  it("sigue siendo un formulario nativo de la accion de emision", () => {
    const html = pintar();

    expect(html).toContain('action="emitir-action"');
    expect(html).toContain('name="personaId"');
    expect(html).toContain("Emitir constancia</button>");
  });

  /** S5: lo que se va a imprimir se lee antes de confirmar, no despues. */
  it("muestra la hoja de la constancia con los datos de la vista previa", () => {
    const html = pintar();

    expect(html).toContain("Constancia de vecindad");
    expect(html).toContain("Quien suscribe hace constar que");
    expect(html).toContain("Guadalupe Kumul Poot");
    expect(html).toContain("Maria Poot");
  });

  /**
   * S6: el aviso deja de estar en letra chica y dice cuanto tiempo lleva la
   * persona ahi, para que la operadora compruebe la fecha de un vistazo.
   */
  it("el aviso dice cuanto tiempo lleva la persona en su domicilio", () => {
    const html = pintar();

    expect(html).toContain("Reside ahí desde el 1 oct 2026: 1 mes y 17 días.");
    expect(html).toContain(
      "El sistema no aplica un periodo mínimo: verifique la fecha antes de confirmar.",
    );
  });

  /** La fecha se escribe como fecha civil: nunca el ISO crudo de la base. */
  it("no deja ver la fecha civil en formato ISO", () => {
    expect(pintar()).not.toContain("2026-10-01");
  });

  it("sin residencia vigente no hay hoja y se avisa el bloqueo", () => {
    const html = pintar({ direccion: null });

    expect(html).toContain(
      "No hay una residencia vigente registrada para esta persona.",
    );
    expect(html).not.toContain("Quien suscribe hace constar que");
    expect(html).not.toContain("no aplica un periodo mínimo");
  });
});
