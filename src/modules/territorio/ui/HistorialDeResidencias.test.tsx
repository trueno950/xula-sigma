import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResidenciaConDireccion } from "../application/historialDeResidencias";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
} from "../domain";
import { HistorialDeResidencias } from "./HistorialDeResidencias";

const residencia = (
  datos: Pick<ResidenciaConDireccion, "texto" | "desdeEn" | "hastaEn"> & {
    id: string;
    numero: string | null;
  },
): ResidenciaConDireccion => ({
  id: comoResidenciaId(datos.id),
  personaId: "11111111-1111-4111-8111-111111111111",
  domicilioId: comoDomicilioId("44444444-4444-4444-8444-444444444444"),
  desdeEn: datos.desdeEn,
  hastaEn: datos.hastaEn,
  creadoEn: new Date("2024-01-01T00:00:00Z"),
  domicilio: {
    calleId: comoCalleId("55555555-5555-4555-8555-555555555555"),
    lugarId: comoLugarId("66666666-6666-4666-8666-666666666666"),
    numero: datos.numero,
  },
  texto: datos.texto,
});

describe("HistorialDeResidencias", () => {
  it("muestra la direccion completa de cada residencia y marca la vigente", () => {
    const html = renderToStaticMarkup(
      <HistorialDeResidencias
        historial={[
          residencia({
            id: "33333333-3333-4333-8333-333333333331",
            texto: "Calle 20 10, Colonia Centro, Motul",
            numero: "10",
            desdeEn: "2025-03-01",
            hastaEn: null,
          }),
          residencia({
            id: "33333333-3333-4333-8333-333333333332",
            texto: "Calle 31 S/N, Motul",
            numero: null,
            desdeEn: "2024-01-01",
            hastaEn: "2025-03-01",
          }),
        ]}
      />,
    );

    expect(html.match(/>Vigente</g)).toHaveLength(1);
    expect(html).toMatch(
      /Calle 20 10, Colonia Centro, Motul<span[\s\S]*?Vigente/,
    );
    expect(html.indexOf("Vigente")).toBeLessThan(html.indexOf("Calle 31"));
  });

  it("si la direccion ya no se puede leer lo dice, en vez de mostrar solo el numero", () => {
    const html = renderToStaticMarkup(
      <HistorialDeResidencias
        historial={[
          residencia({
            id: "33333333-3333-4333-8333-333333333333",
            texto: null,
            numero: "10",
            desdeEn: "2025-03-01",
            hastaEn: null,
          }),
        ]}
      />,
    );

    expect(html).toMatch(/Dirección no disponible<span[\s\S]*?Vigente/);
    expect(html).not.toContain("Número 10");
  });
});
