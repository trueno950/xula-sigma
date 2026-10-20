import { describe, expect, it } from "vitest";
import {
  cabeceraId,
  coloniaId,
  manzanaId,
  renderFormulario,
} from "./fixturasDeFormularioDeDomicilio";

describe("FormularioDeDomicilio: orden de campos y zona", () => {
  it("pone Calle antes de la zona y la zona como campo con etiqueta", () => {
    const html = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(html.indexOf('name="calleId"')).toBeLessThan(
      html.indexOf('name="lugarId"'),
    );

    expect(html).not.toContain("<details");
    expect(html).toContain(
      "Sin elegir colonia, se guarda en el asentamiento de la calle.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain("Colonia (opcional)");
    // Sin contexto de navegacion no hay raiz/nodo que emitir.
    expect(html).not.toContain('name="raiz"');
    expect(html).not.toContain('name="nodo"');
  });

  it("con contexto de navegacion emite raiz y nodo ocultos", () => {
    const html = renderFormulario(
      {
        id: cabeceraId,
        tipo: "cabecera",
        nombre: "Tepakan",
      },
      { raiz: cabeceraId, nodo: coloniaId },
    );

    expect(html).toContain(
      'name="raiz" value="11111111-1111-4111-8111-111111111111"',
    );
    expect(html).toContain(
      'name="nodo" value="22222222-2222-4222-8222-222222222222"',
    );
  });

  it("en el asentamiento abre sin zona y lista el catalogo de calles", () => {
    const html = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(html).toContain("Sin colonia: Tepakan");
    expect(html).toContain("Calle 21");
  });

  it("en una manzana prefija el nodo y el resumen nombra la cadena", () => {
    const html = renderFormulario({
      id: manzanaId,
      tipo: "manzana",
      nombre: "San Pedro",
    });

    expect(html).toContain(
      "Sin cambiar la colonia, se guarda en Manzana San Pedro · Sector 2 · Colonia Pablo · Tepakan.",
    );
    expect(html).not.toContain("Se guardara en:");
    expect(html).toContain(`value="${manzanaId}" selected=""`);
    expect(html).toContain("San Pedro — Tepakan › Pablo › 2");
  });
});
