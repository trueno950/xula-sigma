import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  type CambioDeCalle,
  comoCalleId,
  type EntradaDeHistorial,
} from "../domain";
import { LineaDeTiempoDeCalle } from "./HistorialDeCalle";

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");

const cambioDe = (partes: Partial<CambioDeCalle>): CambioDeCalle => ({
  nombre: { anterior: null, nuevo: null },
  punto: { anterior: null, nuevo: null },
  lugar: { anterior: null, nuevo: null },
  ...partes,
});

const dibujar = (
  naturaleza: EntradaDeHistorial["naturaleza"],
  cambio: CambioDeCalle,
) =>
  renderToStaticMarkup(
    <LineaDeTiempoDeCalle
      historial={{
        calleId,
        estado: "CON_DATOS",
        entradas: [
          {
            id: "e1",
            naturaleza,
            precision: "MOMENTO",
            ocurridoEn: new Date("2026-09-22T15:30:00.000Z"),
            cambio,
          },
        ],
      }}
    />,
  );

describe("LineaDeTiempoDeCalle: el cambio de un evento con payload", () => {
  it("un renombre dice de qué nombre a qué nombre", () => {
    const html = dibujar(
      "RENOMBRE",
      cambioDe({ nombre: { anterior: "Calle 20", nuevo: "Calle 20-A" } }),
    );

    expect(html).toContain("antes «Calle 20» → ahora «Calle 20-A»");
    expect(html).not.toContain("Se cambió el nombre de la calle.");
  });

  it("un reparenteo nombra el lugar anterior y el nuevo", () => {
    const html = dibujar(
      "REPARENTEO",
      cambioDe({ lugar: { anterior: "Comisaría", nuevo: "Colonia Centro" } }),
    );

    expect(html).toContain("antes «Comisaría» → ahora «Colonia Centro»");
    expect(html).not.toContain("Se movió la calle a otro lugar.");
  });

  it("un reparenteo sin los dos nombres no finge el lado que falta", () => {
    const html = dibujar(
      "REPARENTEO",
      cambioDe({ lugar: { anterior: "Comisaría", nuevo: null } }),
    );

    expect(html).toContain("Se movió la calle a otro lugar.");
    expect(html).not.toContain("Comisaría");
  });

  it("una ubicación muestra las coordenadas anteriores y las nuevas", () => {
    const html = dibujar(
      "UBICACION",
      cambioDe({
        punto: {
          anterior: { latitud: 20.937, longitud: -89.6237 },
          nuevo: { latitud: 20.94, longitud: -89.63 },
        },
      }),
    );

    expect(html).toContain(
      "antes 20.937000, -89.623700 → ahora 20.940000, -89.630000",
    );
  });

  it("una primera ubicación dice que antes la calle no tenía punto", () => {
    const html = dibujar(
      "UBICACION",
      cambioDe({
        punto: { anterior: null, nuevo: { latitud: 20.94, longitud: -89.63 } },
      }),
    );

    expect(html).toContain("antes sin punto → ahora 20.940000, -89.630000");
  });

  it("un cambio que dejó el mismo valor no se repite a los dos lados", () => {
    const html = dibujar(
      "UBICACION",
      cambioDe({
        punto: {
          anterior: { latitud: 20.937, longitud: -89.6237 },
          nuevo: { latitud: 20.937, longitud: -89.6237 },
        },
      }),
    );

    expect(html).toContain("Se actualizó el punto de la calle en el mapa.");
    expect(html).not.toContain("antes");
  });

  it("quitar el punto dice que ahora la calle no tiene punto", () => {
    const html = dibujar(
      "UBICACION",
      cambioDe({
        punto: {
          anterior: { latitud: 20.937, longitud: -89.6237 },
          nuevo: null,
        },
      }),
    );

    expect(html).toContain("antes 20.937000, -89.623700 → ahora sin punto");
  });
});
