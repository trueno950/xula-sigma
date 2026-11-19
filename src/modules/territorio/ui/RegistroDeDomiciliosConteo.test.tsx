import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDeLista, OpcionDeLista } from "@/shared/ui";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { RegistroDeDomicilios } from "./RegistroDeDomicilios";

/**
 * La linea de conteo y el pie de S10 en el registro plano. Viven aparte de
 * `RegistroDeDomicilios.test.tsx` por tema -lo demas de ese archivo es el
 * formulario y los enlaces- y para no pasar el tope de 200 lineas.
 */
const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");

const domicilio: DomicilioDelRegistro = {
  id: comoDomicilioId("55555555-5555-4555-8555-555555555555"),
  calle: "Calle 21",
  calleId: comoCalleId("33333333-3333-4333-8333-333333333333"),
  numero: "5",
  lugar: "Centro",
  lugarId: coloniaId,
  raizId: cabeceraId,
};

const raices: readonly OpcionDeLista[] = [
  { valor: cabeceraId, etiqueta: "Tepakan (cabecera)" },
];

type Props = Parameters<typeof RegistroDeDomicilios>[0];

const render = (props: Partial<Props> = {}) =>
  renderToStaticMarkup(
    <RegistroDeDomicilios
      domicilios={[domicilio]}
      hayMas={false}
      estadoDeLista={{ clase: "con-filas" } as EstadoDeLista}
      filtros={{} as FiltrosDeRegistro}
      raices={raices}
      puedeCrear
      total={9}
      coincidencias={1}
      {...props}
    />,
  );

describe("RegistroDeDomicilios: el conteo", () => {
  it("la linea dice cuantas coinciden y cuantas hay, y con que orden", () => {
    const html = render({ filtros: { busqueda: "Calle 21" } });

    expect(html).toContain("de ");
    expect(html).toContain("domicilios para «Calle 21»");
    expect(html).toContain("por asentamiento, calle y número");
  });

  it("sin filtros la linea dice cuantos domicilios hay registrados", () => {
    const html = render({ coincidencias: 9 });

    expect(html).toContain("registrados");
  });

  it("el pie dice lo que se esta viendo de las coincidencias", () => {
    const html = render({ coincidencias: 5 });

    expect(html).toContain("Mostrando");
    expect(html).toContain("1–1");
    expect(html).toContain("5");
  });

  it("cuenta las filas de verdad mostradas, no las coincidencias", () => {
    const html = render({
      domicilios: [domicilio, { ...domicilio, numero: "7" }],
      coincidencias: 5,
    });

    expect(html).toContain("1–2");
  });

  /**
   * La busqueda sin resultados no puede caer al vacio inicial: el municipio
   * tiene domicilios y la linea lo sigue diciendo.
   */
  it("una busqueda sin coincidencias deja el total del municipio en pie", () => {
    const html = render({
      domicilios: [],
      estadoDeLista: {
        clase: "vacio-por-filtro",
        filtro: "Búsqueda: Calle 40",
      },
      filtros: { busqueda: "Calle 40" },
      coincidencias: 0,
    });

    expect(html).toContain("0");
    expect(html).toContain("domicilios para «Calle 40»");
    expect(html).toContain("Sin resultados para");
    expect(html).not.toContain("Todavía no hay domicilios registrados.");
  });
});
