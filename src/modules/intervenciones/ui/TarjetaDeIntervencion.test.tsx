import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comoIntervencionId } from "../domain";
import {
  ID,
  intervencionDePrueba,
  LUGAR,
} from "./ListadoDeIntervencionesDePrueba";
import {
  TarjetaDeIntervencion,
  trozoDeDescripcion,
} from "./TarjetaDeIntervencion";

const tarjeta = (datos: Parameters<typeof intervencionDePrueba>[0] = {}) =>
  renderToStaticMarkup(
    <TarjetaDeIntervencion
      intervencion={intervencionDePrueba(datos)}
      lugar="Centro (colonia)"
    />,
  );

describe("TarjetaDeIntervencion", () => {
  it("S3: lleva identificador estable, tipo, trozo de la descripcion y lugar", () => {
    const html = tarjeta();

    expect(html).toContain("INT-3F1C");
    expect(html).toContain(">Obra<");
    expect(html).toContain("Rehabilitación del parque municipal");
    expect(html).toContain("Centro (colonia)");
    expect(html).toContain("15 ene 2026");
  });

  it("S3: el trozo corta en un espacio y no deja la cola de la descripcion", () => {
    const html = tarjeta();

    expect(html).toContain("…");
    expect(html).not.toContain("acceso principal por la calle 20");
  });

  it("S3: dice que viene de un reporte solo cuando la obra esta ligada", () => {
    expect(tarjeta({ reporteId: "reporte-1" })).toContain("Desde reporte");
    expect(tarjeta()).not.toContain("Desde reporte");
  });

  it("S4: la etiqueta accesible dice tipo, estado, lugar y fecha", () => {
    expect(tarjeta()).toContain(
      'aria-label="INT-3F1C: Obra, Planificada, Centro (colonia), 15 de enero de 2026"',
    );
  });

  it("S4: la etiqueta accesible agrega el origen cuando lo hay", () => {
    expect(tarjeta({ reporteId: "reporte-1" })).toContain(
      'aria-label="INT-3F1C: Obra, Planificada, Centro (colonia), 15 de enero de 2026, viene de un reporte"',
    );
  });

  it("la tarjeta entera enlaza al detalle de la obra por su id", () => {
    expect(tarjeta()).toContain(`href="/intervenciones/${ID}"`);
  });

  it("dos intervenciones con el mismo tipo y lugar se distinguen por el identificador", () => {
    const otra = tarjeta({
      id: comoIntervencionId("8c2190ab-3333-4333-8333-333333333333"),
    });

    expect(tarjeta()).toContain("INT-3F1C");
    expect(otra).toContain("INT-8C21");
  });

  it("no muestra el valor de enum del estado ni del tipo", () => {
    const html = tarjeta();

    expect(html).not.toContain("PLANIFICADA");
    expect(html).not.toContain(">OBRA<");
  });
});

describe("trozoDeDescripcion", () => {
  it("devuelve la descripcion entera cuando cabe", () => {
    expect(trozoDeDescripcion("Bacheo frente al mercado")).toBe(
      "Bacheo frente al mercado",
    );
  });

  it("colapsa los espacios y corta en el ultimo espacio antes del limite", () => {
    const trozo = trozoDeDescripcion(`${"palabra ".repeat(30)}final`);

    expect(trozo.endsWith("…")).toBe(true);
    expect(trozo).not.toContain("final");
    expect(trozo).not.toContain("  ");
  });
});

describe("la tarjeta con un lugar sin resolver", () => {
  it("dice No disponible sin mostrar el uuid del lugar", () => {
    const html = renderToStaticMarkup(
      <TarjetaDeIntervencion
        intervencion={intervencionDePrueba({ lugarId: "otro-lugar" })}
        lugar="No disponible"
      />,
    );

    expect(html).toContain("No disponible");
    expect(html).not.toContain("otro-lugar");
    expect(html).not.toContain(LUGAR);
  });
});
