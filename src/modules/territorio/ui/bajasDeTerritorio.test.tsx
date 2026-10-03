import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import { AccionesDeCalle } from "./AccionesDeCalle";
import { FormularioDeBajaDeCalle } from "./FormularioDeBajaDeCalle";
import { FormularioDeBajaDeDomicilio } from "./FormularioDeBajaDeDomicilio";
import { FormularioDeBajaDeLugar } from "./FormularioDeBajaDeLugar";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./actions/darDeBajaCalleAction", () => ({
  darDeBajaCalleAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaLugarAction", () => ({
  darDeBajaLugarAction: vi.fn(),
}));

const raiz = "11111111-1111-4111-8111-111111111111";
const nodo = "22222222-2222-4222-8222-222222222222";
const calle = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 15",
  lugarId: comoLugarId(nodo),
  punto: null,
};

const vecesQue = (html: string, texto: string) => html.split(texto).length - 1;

describe("la baja en territorio", () => {
  it("la calle nombra que se da de baja, una vez, con icono y en contorno", () => {
    const html = renderToStaticMarkup(
      <FormularioDeBajaDeCalle raiz={raiz} nodo={nodo} calle={calle} />,
    );

    expect(vecesQue(html, "Dar de baja Calle 15")).toBe(1);
    expect(html).toContain("<svg");
    expect(html).toContain("border-senial-error");
    expect(html).not.toContain("w-full");
  });

  it("el lugar nombra que se da de baja en el boton", () => {
    const html = renderToStaticMarkup(
      <FormularioDeBajaDeLugar
        raiz={raiz}
        nodo={nodo}
        nombre="Colonia Centro"
      />,
    );

    expect(vecesQue(html, "Dar de baja Colonia Centro")).toBe(1);
    expect(html).toContain("<svg");
  });

  it("el domicilio nombra la direccion en el boton", () => {
    const html = renderToStaticMarkup(
      <FormularioDeBajaDeDomicilio
        raiz={raiz}
        nodo={nodo}
        domicilio="44444444-4444-4444-8444-444444444444"
        direccion="Calle 15 #12"
      />,
    );

    expect(vecesQue(html, "Dar de baja Calle 15 #12")).toBe(1);
    expect(html).toContain("<svg");
  });

  it("con la baja de calle abierta, el disparador no se repite junto al formulario", () => {
    const abierta = renderToStaticMarkup(
      <AccionesDeCalle
        raizId={comoLugarId(raiz)}
        nodoId={comoLugarId(nodo)}
        calleId={calle.id}
        permisos={permisosDeTerritorio("ADMIN_MUNICIPAL")}
        accionAbierta="bajaCalle"
      />,
    );
    const cerrada = renderToStaticMarkup(
      <AccionesDeCalle
        raizId={comoLugarId(raiz)}
        nodoId={comoLugarId(nodo)}
        calleId={calle.id}
        permisos={permisosDeTerritorio("ADMIN_MUNICIPAL")}
        accionAbierta={undefined}
      />,
    );

    expect(cerrada).toContain("Dar de baja");
    expect(cerrada).toContain("border-senial-error");
    expect(abierta).not.toContain("Dar de baja");
    expect(abierta).toContain("Renombrar");
  });
});
