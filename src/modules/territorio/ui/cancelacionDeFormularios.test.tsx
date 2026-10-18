import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { FormularioDeReparenteo } from "./FormularioDeReparenteo";
import { PanelDeAccion } from "./PanelDeAccion";
import { permisosDeTerritorio } from "./permisos";
import { TabDeCalles } from "./TabDeCalles";
import { TabDeEdicion } from "./TabDeEdicion";
import { TabDeLugares } from "./TabDeLugares";
import { VistaDeRaices } from "./VistaDeRaices";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const hijoId = comoLugarId("22222222-2222-4222-8222-222222222222");

const hijo: NodoDeSubarbol = {
  clase: "lugar",
  id: hijoId,
  tipo: "colonia",
  nombre: "Centro",
  padreId: raizId,
};

const base: PropsDeContenido = {
  raizId,
  lugar: { id: raizId, tipo: "cabecera", nombre: "Buenavista" },
  nodos: [hijo],
  calles: [],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

const volverDeLugares = `/territorio?raiz=${raizId}&nodo=${raizId}&vista=lugares`;
const volverDeCalles = `/territorio?raiz=${raizId}&nodo=${raizId}&vista=calles`;
const volverDeEditar = `/territorio?raiz=${raizId}&nodo=${raizId}&vista=editar`;

/** El interior del `<form>`: ahi tiene que vivir "Cancelar". */
const formularioDe = (html: string) =>
  html.slice(html.indexOf("<form"), html.indexOf("</form>"));

/** El ancla de cancelacion con su destino, sin confundirla con el envio. */
const cancelarDe = (html: string) =>
  html.match(/<a [^>]*href="([^"]*)"[^>]*>Cancelar<\/a>/);

const destinoHtml = (volverA: string) => volverA.replaceAll("&", "&amp;");

describe("Cancelar agrupado con el envio", () => {
  it("el alta de un lugar dentro de otro lleva el cancelar adentro del formulario", () => {
    const html = renderToStaticMarkup(
      <TabDeLugares {...base} accion="lugar" />,
    );
    const form = formularioDe(html);

    expect(cancelarDe(form)?.[1]).toBe(destinoHtml(volverDeLugares));
    expect(html.match(/>Cancelar</g) ?? []).toHaveLength(1);
    expect(form.indexOf("Cancelar")).toBeGreaterThan(
      form.lastIndexOf('type="submit"'),
    );
    expect(form).toContain('name="accion" value="lugar"');
  });

  it("el alta de una calle lleva el cancelar adentro del formulario", () => {
    const html = renderToStaticMarkup(<TabDeCalles {...base} accion="calle" />);
    const form = formularioDe(html);

    expect(cancelarDe(form)?.[1]).toBe(destinoHtml(volverDeCalles));
    expect(form.indexOf("Cancelar")).toBeGreaterThan(
      form.lastIndexOf('type="submit"'),
    );
    expect(form).toContain('name="accion" value="calle"');
  });

  it("renombrar un lugar conserva la vuelta adentro del formulario", () => {
    const html = renderToStaticMarkup(
      <TabDeEdicion {...base} accion="renombrar" />,
    );
    const form = formularioDe(html);

    expect(cancelarDe(form)?.[1]).toBe(destinoHtml(volverDeEditar));
    expect(form).toContain('name="accion" value="renombrar"');
  });

  it("la baja del lugar agrupa el peligro y el cancelar", () => {
    const html = renderToStaticMarkup(<TabDeEdicion {...base} accion="baja" />);
    const form = formularioDe(html);

    expect(cancelarDe(form)?.[1]).toBe(destinoHtml(volverDeEditar));
    expect(form).toContain("Dar de baja");
    expect(form).toContain("border-senial-error");
  });

  it("el alta de la raiz desde la entrada de territorio agrupa el cancelar", () => {
    const html = renderToStaticMarkup(
      <VistaDeRaices
        raices={[]}
        lugares={[]}
        hayCabecera={false}
        puedeEscribir
        altaAbierta
      />,
    );
    const form = formularioDe(html);

    expect(cancelarDe(form)?.[1]).toBe("/territorio");
    expect(form).toContain('name="accion" value="lugar"');
  });
});

describe("Reparenteo sin salida conserva la vuelta", () => {
  it("una colonia sin destinos deja cancelar adentro de su panel", () => {
    const html = renderToStaticMarkup(
      <FormularioDeReparenteo
        raiz={raizId}
        nodo={hijoId}
        tipoDelLugar="colonia"
        lugares={[]}
        volverA={volverDeEditar}
      />,
    );

    expect(html).not.toContain("<form");
    expect(cancelarDe(html)?.[1]).toBe(destinoHtml(volverDeEditar));
  });
});

describe("PanelDeAccion: respaldo del cancelar", () => {
  it("sin volverA no pinta un cancelar suelto bajo el formulario", () => {
    const html = renderToStaticMarkup(
      <PanelDeAccion titulo="Formulario">
        <p>Campos</p>
      </PanelDeAccion>,
    );

    expect(html).not.toContain("Cancelar");
  });

  it("con volverA conserva el cancelar del respaldo", () => {
    const html = renderToStaticMarkup(
      <PanelDeAccion titulo="Formulario" volverA="/territorio">
        <p>Campos</p>
      </PanelDeAccion>,
    );

    expect(cancelarDe(html)?.[1]).toBe("/territorio");
  });
});
