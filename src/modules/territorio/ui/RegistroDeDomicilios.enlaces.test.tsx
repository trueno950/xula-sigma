import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDeLista, OpcionDeLista } from "@/shared/ui";
import type {
  DomicilioDelRegistro,
  FiltrosDeRegistro,
} from "../application/puertosDeDomicilios";
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

describe("RegistroDeDomicilios: enlaces, filtros y vacio", () => {
  describe("filas con enlace", () => {
    const fila = (html: string) =>
      html.split('aria-label="Domicilios del municipio"')[1] ?? "";

    it("con filtro de asentamiento la fila enlaza al panel del domicilio", () => {
      const html = render({ filtros: { raizId: cabeceraId } });

      expect(fila(html)).toContain(
        `href="/territorio?raiz=${cabeceraId}&amp;nodo=${coloniaId}&amp;vista=domicilios&amp;domicilio=${domicilio.id}#panel-de-domicilio"`,
      );
      expect(fila(html)).toContain("aria-label=");
    });

    it("sin filtro enlaza cuando el lugar del domicilio es un asentamiento", () => {
      const html = render({
        domicilios: [{ ...domicilio, lugarId: cabeceraId }],
      });

      expect(fila(html)).toContain(
        `href="/territorio?raiz=${cabeceraId}&amp;nodo=${cabeceraId}&amp;vista=domicilios&amp;domicilio=${domicilio.id}#panel-de-domicilio"`,
      );
    });

    it("sin forma de saber el asentamiento la fila no promete un enlace", () => {
      const html = render();

      expect(fila(html)).not.toContain("<a");
      expect(fila(html)).toContain("Calle 21 5");
    });
  });

  describe("filtros puestos", () => {
    const filtros = { raizId: cabeceraId, calle: "Calle 21", numero: "5" };

    it("cada filtro es un chip que lo quita y conserva los otros", () => {
      const html = render({ filtros });

      expect(html).toContain("Quitar filtro: Calle: Calle 21");
      expect(html).toContain("Quitar filtro: Número: 5");
      expect(html).toContain("Quitar filtro: Asentamiento: Tepakan (cabecera)");
      expect(html).toContain(
        `href="/territorio/domicilios?numero=5&amp;raiz=${cabeceraId}"`,
      );
      expect(html).toContain(
        `href="/territorio/domicilios?q=Calle+21&amp;raiz=${cabeceraId}"`,
      );
      expect(html).toContain(
        'href="/territorio/domicilios?q=Calle+21&amp;numero=5"',
      );
    });

    it("sin filtros no hay chips", () => {
      expect(render()).not.toContain("Quitar filtro");
    });

    it("el vacio por filtro conserva los chips para quitarlos uno a uno", () => {
      const html = render({
        domicilios: [],
        filtros,
        estadoDeLista: {
          clase: "vacio-por-filtro",
          filtro: "Calle: Calle 21, Número: 5",
        },
      });

      expect(html).toContain("Sin resultados para");
      expect(html).toContain("Calle: Calle 21, Número: 5");
      expect(html).toContain("Quitar filtro: Número: 5");
    });
  });

  describe("vacio inicial", () => {
    it("lleva un icono, una frase y el alta como accion primaria", () => {
      const html = render({
        domicilios: [],
        estadoDeLista: { clase: "vacio-inicial" },
      });

      expect(html).toContain("Todavía no hay domicilios registrados.");
      expect(html.match(/href="\/territorio\?accion=domicilio"/g)).toHaveLength(
        1,
      );
    });

    it("sin permiso de escritura el vacio no ofrece el alta", () => {
      const html = render({
        domicilios: [],
        estadoDeLista: { clase: "vacio-inicial" },
        puedeCrear: false,
      });

      expect(html).not.toContain("accion=domicilio");
    });
  });
});
