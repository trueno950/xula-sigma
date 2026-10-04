import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LugarId } from "../domain";
import { VacioDeDomicilios } from "./VacioDeDomicilios";

const raizId = "11111111-1111-4111-8111-111111111111" as LugarId;
const lugar = { id: raizId, tipo: "cabecera" as const, nombre: "Tepakan" };

const htmlDe = (sinCalles: boolean, puedeActuar: boolean) =>
  renderToStaticMarkup(
    <VacioDeDomicilios
      raizId={raizId}
      lugar={lugar}
      sinCalles={sinCalles}
      puedeActuar={puedeActuar}
    />,
  );

describe("VacioDeDomicilios", () => {
  it("un rol de solo lectura sin calles recibe el dato, sin tarea ni enlace", () => {
    const html = htmlDe(true, false);

    expect(html).toContain("Tepakan no tiene domicilios todavía.");
    expect(html).toContain("Todavía no hay calles cargadas");
    expect(html).not.toContain("Antes de cargar");
    expect(html).not.toContain("Agregar la primera calle");
    expect(html).not.toContain("accion=calle");
  });

  it("quien puede actuar sin calles recibe la instruccion y la salida", () => {
    const html = htmlDe(true, true);

    expect(html).toContain("Antes de cargar un domicilio");
    expect(html).toContain("Agregar la primera calle");
    expect(html).toContain("accion=calle");
  });

  it("con calles no menciona calles a nadie", () => {
    const html = htmlDe(false, false);

    expect(html).toContain("Tepakan no tiene domicilios todavía.");
    expect(html).not.toContain("calles");
  });
});
