import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReporteDeDetalle } from "../application/detalleDeReporte";
import { comoReporteId } from "../domain";
import { FichaDeReporte, resumenDeUbicacion } from "./FichaDeReporte";

const ID = "11111111-1111-4111-8111-111111111111";

const reporte = (
  parcial: Partial<ReporteDeDetalle> = {},
): ReporteDeDetalle => ({
  id: comoReporteId(ID),
  folio: "REP-2026-000123",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  lugarId: "lugar-1",
  calleId: "calle-1",
  referencia: null,
  descripcion: "Bache enorme",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "u1",
  registradoEn: new Date("2026-11-16T17:15:00Z"),
  actualizadoEn: new Date("2026-11-16T17:15:00Z"),
  fechaDeRegistro: "2026-11-16",
  ubicacion: {
    modo: "CALLE",
    lugar: "Colonia Centro",
    calleId: "calle-1",
    calle: "Calle 26",
    domicilio: null,
    raizId: "raiz-1",
  },
  ...parcial,
});

const html = (
  parcial: Partial<ReporteDeDetalle> = {},
  atraso: number | null = null,
) =>
  renderToStaticMarkup(
    <FichaDeReporte reporte={reporte(parcial)} atraso={atraso} />,
  );

describe("FichaDeReporte, los datos en pares compactos", () => {
  it("dice tipo, area y fecha de registro con la etiqueta de cada uno", () => {
    const pagina = html();

    expect(pagina).toContain("Ficha del reporte");
    expect(pagina).toContain(">Tipo<");
    expect(pagina).toContain(">Bache<");
    expect(pagina).toContain(">Área<");
    expect(pagina).toContain(">Sin asignar<");
    expect(pagina).toContain(">Fecha de registro<");
    expect(pagina).toContain("16 nov 2026");
  });

  it("la fecha de registro es la civil que resuelve el caso de uso, no la del proceso", () => {
    // `2026-11-16T17:15:00Z` son las 11:15 del 16 en Merida; el dia civil que
    // llega por la fila es el que se imprime.
    expect(html()).toContain("16 nov 2026");
    expect(html({ fechaDeRegistro: "2026-01-31" })).toContain("31 ene 2026");
  });

  it("muestra el area asignada cuando la tiene", () => {
    expect(html({ areaResponsable: "OBRAS_PUBLICAS" })).toContain(
      ">Obras públicas<",
    );
  });
});

describe("FichaDeReporte, el estado con la insignia de la bandeja", () => {
  it("el estado va en insignia con su palabra y el atraso al lado", () => {
    const pagina = html({}, 6);

    expect(pagina).toContain("Recibido");
    expect(pagina).toContain("Atrasado · 6 días");
    expect(pagina).toContain("rounded-pill");
  });

  it("sin atraso no pinta la insignia de atraso", () => {
    expect(html()).not.toContain("Atrasado");
  });
});

describe("FichaDeReporte, donde ocurrio", () => {
  it("nombra la calle y el lugar, y enlaza al historial de la calle y al mapa", () => {
    const pagina = html();

    expect(pagina).toContain("Dónde ocurrió");
    expect(pagina).toContain("Calle 26");
    expect(pagina).toContain("Colonia Centro");
    expect(pagina).toContain('href="/calles/calle-1/historial"');
    expect(pagina).toContain('href="/mapa-operativo?lugar=raiz-1"');
    expect(pagina).toContain("Ver historial de la calle");
    expect(pagina).toContain("Ver en el mapa");
  });

  it("sin calle las dos salidas no se ofrecen y la ficha no inventa un nombre", () => {
    const pagina = html({
      ubicacion: {
        modo: "DOMICILIO",
        lugar: null,
        calleId: null,
        calle: null,
        domicilio: "Calle 20 #123 entre 21 y 23",
        raizId: null,
      },
    });

    expect(pagina).toContain("Calle 20 #123 entre 21 y 23");
    expect(pagina).not.toContain("/calles/");
    expect(pagina).not.toContain("/mapa-operativo");
    expect(pagina).not.toContain("Ver historial de la calle");
  });
});

describe("FichaDeReporte, descripcion, referencia y reporte cerrado", () => {
  it("la descripcion va en su bloque y la referencia solo cuando existe", () => {
    expect(html()).toContain("Descripción");
    expect(html()).toContain("Bache enorme");
    expect(html()).not.toContain("Referencia");
    expect(html({ referencia: "Enfrente del seguro" })).toContain(
      "Enfrente del seguro",
    );
  });

  it("un reporte cerrado dice que no hay acciones en vez de dejar el hueco", () => {
    const resuelto = html({ estado: "RESUELTO" });

    expect(resuelto).toContain("Sin acciones: el reporte está cerrado.");
    expect(html()).not.toContain("Sin acciones");
  });
});

describe("resumenDeUbicacion, la linea bajo el folio", () => {
  it("nombra el tipo, la calle y el lugar de la fila del detalle", () => {
    expect(resumenDeUbicacion(reporte())).toBe(
      "Bache en Calle 26, Colonia Centro",
    );
  });

  it("con domicilio nombra el domicilio", () => {
    const domicilio = reporte({
      ubicacion: {
        modo: "DOMICILIO",
        lugar: null,
        calleId: null,
        calle: null,
        domicilio: "Calle 20 #123",
        raizId: null,
      },
    });

    expect(resumenDeUbicacion(domicilio)).toBe("Bache en Calle 20 #123");
  });

  it("sin ubicacion resuelta se queda con el tipo: no inventa un lugar", () => {
    const sinNombres = reporte({
      ubicacion: {
        modo: "CALLE",
        lugar: null,
        calleId: null,
        calle: null,
        domicilio: null,
        raizId: null,
      },
    });

    expect(resumenDeUbicacion(sinNombres)).toBe("Bache");
  });
});
