import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
  comoZonaId,
} from "../domain";
import { HistorialDeResidencias } from "./HistorialDeResidencias";
import { ListaDeCalles } from "./ListaDeCalles";

vi.mock("./FormulariosDeZona", () => ({
  FormularioDeAltaDeZona: () => null,
  FormularioDeBajaDeZonaEnFila: () => <form data-formulario="baja-zona" />,
}));

const { ListaDeZonas } = await import("./ListaDeZonas");

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const calle = (
  id: string,
  punto: { latitud: number; longitud: number } | null,
) => ({
  id: comoCalleId(`${id.repeat(8)}-3333-4333-8333-333333333333`),
  nombre: `Calle ${id}`,
  lugarId: raizId,
  punto,
});

/** La clase del `<span>` que envuelve un texto: la celda o la insignia. */
const clasesDe = (html: string, texto: string) =>
  [
    ...html.matchAll(
      /<span class="([^"]*)"[^>]*>(?:<svg.*?<\/svg>)?([^<]*)<\/span>/g,
    ),
  ]
    .filter((m) => m[2] === texto)
    .map((m) => m[1] ?? "");

describe("ListaDeCalles: la ubicacion es un estado", () => {
  const html = renderToStaticMarkup(
    <ListaDeCalles
      raizId={raizId}
      lugar={{ id: raizId, tipo: "cabecera", nombre: "Motul" }}
      calles={[
        calle("a", null),
        calle("b", { latitud: 21.1, longitud: -89.3 }),
      ]}
      hayMas={false}
      calleId={undefined}
    />,
  );

  it("Sin ubicar va en insignia de aviso, no en monoespaciada", () => {
    const [clases = ""] = clasesDe(html, "Sin ubicar");

    expect(clases).toContain("bg-senial-aviso-suave");
    expect(clases).not.toContain("font-mono");
  });

  it("Ubicada va en insignia de exito", () => {
    const [clases = ""] = clasesDe(html, "Ubicada");

    expect(clases).toContain("bg-senial-exito-suave");
  });
});

describe("ListaDeZonas: el asentamiento es dato de apoyo", () => {
  const html = renderToStaticMarkup(
    <ListaDeZonas
      zonas={[
        {
          id: comoZonaId("44444444-4444-4444-8444-444444444444"),
          nombre: "Sector 1",
          lugarId: raizId,
          asentamiento: "Motul",
        },
      ]}
      asentamientos={[]}
      raizActiva={null}
      error={undefined}
      aviso={undefined}
    />,
  );

  it("el asentamiento va en Label, no en monoespaciada", () => {
    const [clases = ""] = clasesDe(html, "Motul");

    expect(clases).toContain("text-[13px]");
    expect(clases).not.toContain("font-mono");
  });

  it("la accion de baja no va dentro de una celda monoespaciada", () => {
    expect(html).not.toMatch(
      /font-mono[^"]*"><form data-formulario="baja-zona"/,
    );
  });
});

describe("HistorialDeResidencias: vigente y fechas civiles", () => {
  const html = renderToStaticMarkup(
    <HistorialDeResidencias
      historial={[
        {
          id: comoResidenciaId("33333333-3333-4333-8333-333333333331"),
          personaId: "11111111-1111-4111-8111-111111111111",
          domicilioId: comoDomicilioId("44444444-4444-4444-8444-444444444444"),
          desdeEn: "2024-08-30",
          hastaEn: null,
          creadoEn: new Date("2024-01-01T00:00:00Z"),
          domicilio: {
            calleId: comoCalleId("55555555-5555-4555-8555-555555555555"),
            lugarId: raizId,
            numero: "10",
          },
          texto: "Calle 20 10, Motul",
        },
      ]}
    />,
  );

  it("Vigente es una insignia de exito, no texto pegado a la direccion", () => {
    const [clases = ""] = clasesDe(html, "Vigente");

    expect(clases).toContain("bg-senial-exito-suave");
    expect(html).not.toContain("· Vigente");
  });

  it("las fechas se leen como fecha civil, no en ISO", () => {
    expect(html).toContain("Desde 30 ago 2024");
    expect(html).not.toContain("2024-08-30");
  });
});
