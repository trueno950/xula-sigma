import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDeLista } from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";
import { comoCalleId, comoLugarId } from "../domain";
import { FiltrosDeDomicilios } from "./FiltrosDeDomicilios";
import { FormularioDeAltaDeCalle } from "./FormularioDeAltaDeCalle";
import {
  cabeceraId,
  renderFormulario,
} from "./fixturasDeFormularioDeDomicilio";
import { vistaInicialDelMapa } from "./mapaLeaflet";
import { RegistroDeDomicilios } from "./RegistroDeDomicilios";
import { centroDeCalles } from "./vistaDeCalles";

const leyendas = (html: string) =>
  [...html.matchAll(/<legend class="([^"]*)"/g)].map((m) => m[1] ?? "");

describe("jerarquia de los formularios dentro de un panel", () => {
  it("el alta de calle tiene un solo grupo y no repite un titulo", () => {
    const html = renderToStaticMarkup(
      <FormularioDeAltaDeCalle raiz="r" nodo="n" />,
    );

    expect(html).not.toContain("<legend");
    expect(html).toContain('name="nombre"');
  });

  it("los grupos del alta de domicilio quedan por debajo del titulo del panel", () => {
    const grupos = leyendas(
      renderFormulario({ id: cabeceraId, tipo: "cabecera", nombre: "Tepakan" }),
    );

    expect(grupos).toHaveLength(3);
    for (const clases of grupos) {
      expect(clases).toContain("text-[15px]");
      expect(clases).not.toContain("text-[1.25rem]");
    }
  });
});

describe("un verbo para el alta de domicilio", () => {
  it("el envio del alta dice Registrar domicilio", () => {
    const html = renderFormulario({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Tepakan",
    });

    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*>Registrar domicilio<\/button>/,
    );
    expect(html).not.toContain("Dar de alta");
  });

  it.each([
    ["con filas", { clase: "con-filas" }],
    ["vacio", { clase: "vacio-inicial" }],
  ] as const)(
    "el registro ofrece Registrar domicilio con icono (%s)",
    (_, estado) => {
      const html = renderToStaticMarkup(
        <RegistroDeDomicilios
          domicilios={[]}
          hayMas={false}
          estadoDeLista={estado as EstadoDeLista}
          filtros={{} as FiltrosDeRegistro}
          raices={[]}
          puedeCrear
        />,
      );

      expect(html).toMatch(/<\/svg>Registrar domicilio<\/a>/);
      expect(html).not.toContain("Agregar domicilio");
    },
  );
});

describe("filtros del registro en movil", () => {
  const html = renderToStaticMarkup(
    <FiltrosDeDomicilios filtros={{} as FiltrosDeRegistro} raices={[]} />,
  );

  it("bajo 640px los campos se apilan a ancho completo", () => {
    expect(html).toMatch(
      /<form[^>]*class="[^"]*max-sm:flex-col[^"]*max-sm:items-stretch/,
    );
    expect(html).toMatch(/id="q"[^>]*class="[^"]*w-full sm:w-64/);
    expect(html).toMatch(/id="numero"[^>]*class="[^"]*w-full sm:w-32/);
  });
});

describe("el mapa de la calle abre en su asentamiento", () => {
  const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
  const calle = (punto: { latitud: number; longitud: number } | null) => ({
    id: comoCalleId("33333333-3333-4333-8333-333333333333"),
    nombre: "Calle",
    lugarId,
    punto,
  });

  it("el centro es el promedio de las calles del lugar que ya tienen punto", () => {
    expect(
      centroDeCalles([
        calle({ latitud: 21, longitud: -89.4 }),
        calle(null),
        calle({ latitud: 21.2, longitud: -89.2 }),
      ]),
    ).toEqual({ latitud: 21.1, longitud: -89.30000000000001 });
  });

  it("sin calles ubicadas no hay centro", () => {
    expect(centroDeCalles([calle(null)])).toBeNull();
  });

  it("abre en el punto, si no en el centro del lugar, si no en Yucatan", () => {
    const yucatan = vistaInicialDelMapa({ punto: null, centro: null });
    const punto = { latitud: 21.1, longitud: -89.3 };

    expect(vistaInicialDelMapa({ punto, centro: null })).toEqual([
      [21.1, -89.3],
      15,
    ]);
    expect(vistaInicialDelMapa({ punto: null, centro: punto })).toEqual([
      [21.1, -89.3],
      14,
    ]);
    expect(yucatan[1]).toBe(8);
  });
});
