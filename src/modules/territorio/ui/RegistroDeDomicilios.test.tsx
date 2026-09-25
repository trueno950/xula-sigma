import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDeLista, OpcionDeLista } from "@/shared/ui";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
import { TAMANO_DE_PAGINA } from "../application/registroDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import { RegistroDeDomicilios } from "./RegistroDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");

const domicilio: DomicilioDelRegistro = {
  id: comoDomicilioId("55555555-5555-4555-8555-555555555555"),
  calle: "Calle 21",
  calleId,
  numero: "5",
  lugar: "Centro",
  lugarId: coloniaId,
};

const raices: readonly OpcionDeLista[] = [
  { valor: cabeceraId, etiqueta: "Tepakan (cabecera)" },
];

const base = {
  domicilios: [domicilio],
  hayMas: false,
  estadoDeLista: { clase: "con-filas" } as EstadoDeLista,
  filtros: {} as FiltrosDeRegistro,
  raices,
  puedeCrear: true,
};

const render = (
  resto: Partial<ComponentProps<typeof RegistroDeDomicilios>> = {},
) => renderToStaticMarkup(<RegistroDeDomicilios {...base} {...resto} />);

describe("RegistroDeDomicilios", () => {
  it("pinta una fila por domicilio con su direccion y su lugar", () => {
    const html = render();

    expect(html).toContain("Calle 21 5");
    expect(html).toContain("Centro");
  });

  it("pinta el numero como S/N cuando el domicilio no tiene", () => {
    const html = render({
      domicilios: [{ ...domicilio, numero: null }],
    });

    expect(html).toContain("Calle 21 S/N");
  });

  it("sin filas y sin filtro pinta el vacio inicial, sin ofrecer Ver mas", () => {
    const html = render({
      domicilios: [],
      estadoDeLista: { clase: "vacio-inicial" },
    });

    expect(html).toContain("Todavía no hay domicilios registrados.");
    expect(html).not.toContain("Ver mas");
  });

  it("con un filtro puesto sin resultados nombra el filtro que vacio la lista", () => {
    const html = render({
      domicilios: [],
      estadoDeLista: { clase: "vacio-por-filtro", filtro: "Calle 21" },
    });

    expect(html).toContain("Sin resultados para");
    expect(html).toContain("Calle 21");
    expect(html).toContain('href="/territorio/domicilios"');
  });

  it("no ofrece Ver mas cuando el registro no trajo una fila de mas", () => {
    expect(render({ hayMas: false })).not.toContain("Ver mas");
  });

  it("ofrece Ver mas solo cuando hay una pagina siguiente", () => {
    expect(render({ hayMas: true })).toContain("Ver mas");
  });

  it("el Ver mas lleva los filtros puestos y un limite mayor, nunca reiniciado", () => {
    const html = render({
      hayMas: true,
      filtros: { raizId: cabeceraId, calle: "Calle 21", numero: "5" },
    });

    expect(html).toContain(
      `href="/territorio/domicilios?q=Calle+21&amp;numero=5&amp;raiz=${cabeceraId}&amp;limite=${
        TAMANO_DE_PAGINA * 2
      }"`,
    );
  });

  /**
   * El segundo clic, que es donde "Ver mas" se rompe sin que el primero lo
   * note: si la pantalla no recibe el limite vigente, el link recalcula
   * desde el default y devuelve siempre la misma segunda pagina.
   */
  it("el segundo Ver mas parte del limite vigente, no del default", () => {
    const html = render({ hayMas: true, limite: TAMANO_DE_PAGINA * 2 });

    expect(html).toContain(`limite=${TAMANO_DE_PAGINA * 3}"`);
  });

  it("un solo formulario GET con los cuatro filtros de la pantalla", () => {
    const html = render();
    const formularios = html.match(/<form/g) ?? [];

    expect(formularios).toHaveLength(1);
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain('name="numero"');
    expect(html).toContain('name="raiz"');
  });

  it("el select de asentamiento ofrece las raices del municipio", () => {
    const html = render();

    expect(html).toContain("Tepakan (cabecera)");
  });

  it("los filtros puestos vuelven a aparecer en el formulario", () => {
    const html = render({
      filtros: { raizId: cabeceraId, calle: "Calle 21", numero: "5" },
    });

    expect(html).toContain('value="Calle 21"');
    expect(html).toContain('value="5"');
    expect(html).toContain(`value="${cabeceraId}" selected=""`);
  });

  it("ofrece agregar un domicilio al registro plano cuando puedeCrear", () => {
    const html = render({ puedeCrear: true });

    expect(html).toContain('href="/territorio?accion=domicilio"');
    expect(html).toContain("Agregar domicilio");
  });

  it("no ofrece agregar sin permiso de escritura", () => {
    const html = render({ puedeCrear: false });

    expect(html).not.toContain("Agregar domicilio");
  });
});
