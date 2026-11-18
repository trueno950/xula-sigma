import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EstadoDeReporte } from "../domain";

vi.mock("./actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock("./actions/asignarAreaAction", () => ({
  asignarAreaAction: "area-action",
}));

const { AccionesDeReporte } = await import("./AccionesDeReporte");

const ID = "11111111-1111-4111-8111-111111111111";

const html = (estadoActual: EstadoDeReporte, conObra = true) =>
  renderToStaticMarkup(
    <AccionesDeReporte
      reporteId={ID}
      estadoActual={estadoActual}
      programarObra={conObra ? <p>formulario de obra</p> : undefined}
    />,
  );

const desplegables = (pagina: string): number =>
  (pagina.match(/<details/g) ?? []).length;

describe("AccionesDeReporte, el paso siguiente (S13)", () => {
  it("el primer destino valido es la accion primaria de la pantalla", () => {
    const pagina = html("RECIBIDO");

    expect(pagina).toContain("Siguiente paso");
    expect(pagina).toMatch(
      /<button class="[^"]*bg-marca[^"]*" type="submit">Marcar en atención<\/button>/,
    );
  });

  it("el otro destino valido va despues y como secundaria, no como otra primaria", () => {
    const pagina = html("RECIBIDO");
    const primaria = pagina.indexOf("Marcar en atención");
    const secundaria = pagina.indexOf("Marcar resuelto");

    expect(secundaria).toBeGreaterThan(primaria);
    expect(pagina).toMatch(
      /<button class="[^"]*border-caliza-borde[^"]*" type="submit">Marcar resuelto<\/button>/,
    );
  });

  it("en atencion el unico paso siguiente es marcar resuelto", () => {
    const pagina = html("EN_ATENCION");

    expect(pagina).toMatch(
      /<button class="[^"]*bg-marca[^"]*" type="submit">Marcar resuelto<\/button>/,
    );
    expect(pagina).not.toContain(">Marcar en atención<");
  });
});

describe("AccionesDeReporte, lo demas va plegado (S13, S14)", () => {
  it("programar obra, asignar area y rechazar son desplegables nativos, sin isla cliente", () => {
    const pagina = html("RECIBIDO");

    expect(desplegables(pagina)).toBe(3);
    expect(pagina).toContain(">Programar obra…");
    expect(pagina).toContain(">Asignar área…");
    expect(pagina).toContain(">Rechazar reporte…");
    expect(pagina).not.toContain("use client");
  });

  it("los desplegables forman un acordeon: abrir uno cierra el otro y el panel no crece", () => {
    const pagina = html("RECIBIDO");

    // Mismo `name` en cada `<details>`: el navegador deja abierto uno solo.
    expect(
      (pagina.match(/<details name="acciones-del-reporte"/g) ?? []).length,
    ).toBe(3);
  });

  it("sin obra programable quedan los otros dos desplegables", () => {
    const pagina = html("RECIBIDO", false);

    expect(desplegables(pagina)).toBe(2);
    expect(pagina).not.toContain("Programar obra");
  });
});

describe("AccionesDeReporte, rechazar al final y separado", () => {
  it("rechazar queda despues de asignar area, tras el divisor y con el contorno de error", () => {
    const pagina = html("RECIBIDO");
    const area = pagina.indexOf("Asignar área…");
    const divisor = pagina.indexOf("border-t border-caliza-divisor");
    const rechazo = pagina.indexOf("Rechazar reporte…");

    expect(divisor).toBeGreaterThan(area);
    expect(rechazo).toBeGreaterThan(divisor);
    expect(pagina).toMatch(
      /<summary class="[^"]*border-senial-error[^"]*">Rechazar reporte…/,
    );
  });

  it("el formulario de rechazo conserva el folio del original y su ayuda", () => {
    const pagina = html("RECIBIDO");

    expect(pagina).toContain("Folio del reporte original");
    expect(pagina).toContain("Solo si el motivo es Duplicado.");
    expect(pagina).toContain(
      '<option value="FUERA_DE_COMPETENCIA">Fuera de competencia</option>',
    );
    expect(pagina).toContain(
      '<option value="INFORMACION_INSUFICIENTE">Información insuficiente</option>',
    );
  });

  it("ofrece areas con etiqueta y el codigo como valor", () => {
    expect(html("RECIBIDO")).toContain(
      '<option value="LIMPIA_Y_RECOLECCION">Limpia y recolección</option>',
    );
  });
});
