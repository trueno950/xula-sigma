import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReporteDeDetalle } from "../application/detalleDeReporte";
import type { MovimientoGuardado } from "../application/puertosDeMovimientos";
import { comoMovimientoId, comoReporteId } from "../domain";
import { DetalleDeReporte } from "./DetalleDeReporte";
import { HistorialDeReporte } from "./HistorialDeReporte";

const ID = "11111111-1111-4111-8111-111111111111";

const movimiento = (
  parcial: Partial<MovimientoGuardado>,
): MovimientoGuardado => ({
  id: comoMovimientoId("33333333-3333-4333-8333-333333333333"),
  ayuntamientoId: "motul" as MovimientoGuardado["ayuntamientoId"],
  reporteId: comoReporteId(ID),
  usuarioId: "usuario-1",
  estadoAnterior: null,
  estadoNuevo: "RECIBIDO",
  areaAsignada: null,
  motivo: null,
  ocurridoEn: new Date("2026-03-01T18:00:00Z"),
  ...parcial,
});

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

const html = (movimientos: readonly MovimientoGuardado[] = [movimiento({})]) =>
  renderToStaticMarkup(<HistorialDeReporte historial={movimientos} />);

const detalle = (acciones?: ReactNode) =>
  renderToStaticMarkup(
    <DetalleDeReporte
      reporte={reporte()}
      historial={[movimiento({})]}
      atraso={null}
      acciones={acciones}
    />,
  );

describe("HistorialDeReporte", () => {
  it("la transicion con motivo se lee con etiquetas, no con codigos", () => {
    const pagina = html([
      movimiento({
        estadoAnterior: "RECIBIDO",
        estadoNuevo: "RECHAZADO",
        motivo: "DUPLICADO",
      }),
    ]);

    expect(pagina).toContain("Recibido → Rechazado (Duplicado)");
    expect(pagina).not.toContain("RECHAZADO");
  });

  it("una transicion a en atencion se lee con su acento", () => {
    expect(
      html([
        movimiento({ estadoAnterior: "RECIBIDO", estadoNuevo: "EN_ATENCION" }),
      ]),
    ).toContain("Recibido → En atención");
  });

  it("el area asignada se lee con su etiqueta", () => {
    const pagina = html([
      movimiento({
        estadoAnterior: "RECIBIDO",
        estadoNuevo: null,
        areaAsignada: "AGUA_POTABLE_Y_DRENAJE",
      }),
    ]);

    expect(pagina).toContain("Agua potable y drenaje");
    expect(pagina).not.toContain("AGUA_POTABLE_Y_DRENAJE");
  });

  it("los movimientos van en una lista ordenada, con su fecha y hora", () => {
    const pagina = html([movimiento({})]);

    expect(pagina).toMatch(/<ol/);
    expect(pagina).toContain("Reporte recibido");
    expect(pagina).toContain("<time");
  });

  it("sin movimientos lo dice en vez de dejar la lista vacia", () => {
    expect(html([])).toContain("Sin movimientos.");
  });
});

describe("DetalleDeReporte, las dos columnas (S13, S15)", () => {
  it("el orden de lectura es ficha, acciones e historial", () => {
    const pagina = detalle(<p>panel de acciones</p>);
    const ficha = pagina.indexOf("Ficha del reporte");
    const acciones = pagina.indexOf("panel de acciones");
    const historial = pagina.indexOf(">Historial<");

    expect(ficha).toBeGreaterThan(-1);
    expect(acciones).toBeGreaterThan(ficha);
    expect(historial).toBeGreaterThan(acciones);
  });

  it("la ficha y el historial comparten la columna izquierda y las acciones la propia", () => {
    const pagina = detalle(<p>panel de acciones</p>);

    expect(pagina).toContain("lg:grid-cols-[minmax(0,1fr)_320px]");
    expect(pagina).toContain("lg:col-start-2 lg:row-span-2");
    expect(pagina).toContain("lg:col-start-1 lg:row-start-2");
  });

  it("sin acciones el historial sigue a la ficha, sin columna vacia", () => {
    const pagina = detalle();

    expect(pagina).not.toContain("lg:col-start-2");
    expect(pagina.indexOf(">Historial<")).toBeGreaterThan(
      pagina.indexOf("Ficha del reporte"),
    );
  });
});
