import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoLugarId } from "../domain";
import { AccionesDeLugar } from "./AccionesDeLugar";
import type { CuentasDeLugar } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./actions/editarLugarAction", () => ({
  editarLugarAction: vi.fn(),
}));
vi.mock("./actions/reparentearLugarAction", () => ({
  reparentearLugarAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaLugarAction", () => ({
  darDeBajaLugarAction: vi.fn(),
}));

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const otraRaizId = comoLugarId("33333333-3333-4333-8333-333333333333");

const cabecera = {
  id: raizId,
  tipo: "cabecera" as const,
  nombre: "Buenavista",
};
const colonia = { id: coloniaId, tipo: "colonia" as const, nombre: "Centro" };

const CUENTAS: CuentasDeLugar = { lugares: 2, calles: 6, domicilios: 9 };

const laColonia: NodoDeSubarbol = {
  clase: "lugar",
  id: coloniaId,
  tipo: "colonia",
  nombre: "Centro",
  padreId: raizId,
};

const render = (resto: Partial<Parameters<typeof AccionesDeLugar>[0]> = {}) =>
  renderToStaticMarkup(
    <AccionesDeLugar
      raizId={raizId}
      lugar={cabecera}
      nodos={[]}
      calles={[]}
      lugares={[]}
      accion={undefined}
      permisos={permisosDeTerritorio("ADMIN_MUNICIPAL")}
      cuentas={CUENTAS}
      {...resto}
    />,
  );

const textoDe = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** El `<details>` que se abre con esa etiqueta, con su `open`. */
const detallesDe = (html: string, etiqueta: string) => {
  const desde = html.lastIndexOf("<details", html.indexOf(`>${etiqueta}`));

  return html.slice(desde, html.indexOf("</details>", desde));
};

const abierto = (html: string, etiqueta: string) =>
  /^<details[^>]*\sopen/.test(detallesDe(html, etiqueta));

/**
 * S3 de `odd/tasks/territorio-ux.md`: «Editar» deja de ser una pestana y
 * renombrar, mover y dar de baja pasan a un acordeon de la cabecera, con la
 * baja al final y en rojo.
 */
describe("el acordeon de acciones del lugar", () => {
  it("resume lo que el lugar tiene adentro", () => {
    expect(textoDe(render())).toContain("2 colonias · 6 calles · 9 domicilios");
  });

  it("una colonia no anuncia colonias adentro suyo y no suma calles", () => {
    const texto = textoDe(
      render({
        lugar: colonia,
        nodos: [laColonia],
        cuentas: { lugares: 0, calles: 6, domicilios: 9 },
      }),
    );

    expect(texto).not.toContain("colonias");
    expect(texto).toContain("9 domicilios");
  });

  it("ofrece renombrar y dar de baja, con la baja al final y en rojo", () => {
    const html = render();

    expect(html).toContain("Renombrar…");
    expect(html).toContain("Dar de baja…");
    expect(textoDe(html).indexOf("Renombrar…")).toBeLessThan(
      textoDe(html).indexOf("Dar de baja…"),
    );
    expect(detallesDe(html, "Dar de baja…")).toContain("border-senial-error");
  });

  it("los pliegues comparten `name`: abrir uno cierra el otro", () => {
    const html = render();

    expect(html.match(/name="acciones-de-lugar"/g) ?? []).toHaveLength(2);
  });

  it("un asentamiento raiz no ofrece mover: no cuelga de otro lugar", () => {
    expect(render()).not.toContain("Mover a otro asentamiento…");
  });

  it("una colonia ofrece mover a otro asentamiento, entre renombrar y la baja", () => {
    const html = render({
      lugar: colonia,
      nodos: [laColonia],
      lugares: [
        cabecera,
        { id: otraRaizId, tipo: "cabecera" as const, nombre: "Kambul" },
      ],
      cuentas: { lugares: 0, calles: 0, domicilios: 0 },
    });
    const texto = textoDe(html);
    const orden = ["Renombrar…", "Mover a otro asentamiento…", "Dar de baja…"];

    expect(html.match(/name="acciones-de-lugar"/g) ?? []).toHaveLength(3);
    expect(orden.map((etiqueta) => texto.indexOf(etiqueta))).toEqual(
      orden.map((etiqueta) => texto.indexOf(etiqueta)).sort((a, b) => a - b),
    );
  });

  it("el pliegue que la URL nombra abre abierto", () => {
    expect(abierto(render({ accion: "renombrar" }), "Renombrar…")).toBe(true);
    expect(abierto(render({ accion: "baja" }), "Dar de baja…")).toBe(true);
  });

  it("sin accion en la URL todos los pliegues arrancan cerrados", () => {
    const html = render();

    expect(abierto(html, "Renombrar…")).toBe(false);
    expect(abierto(html, "Dar de baja…")).toBe(false);
  });

  it("cada pliegue contiene el formulario nativo de su accion", () => {
    const html = render({ accion: "renombrar" });

    expect(detallesDe(html, "Renombrar…")).toContain("<form");
    expect(detallesDe(html, "Renombrar…")).toContain(
      'name="accion" value="renombrar"',
    );
    expect(detallesDe(html, "Dar de baja…")).toContain(
      'name="accion" value="baja"',
    );
  });

  it("un rol sin permiso de escritura no ve ninguna accion ni ningun formulario", () => {
    const html = render({ permisos: permisosDeTerritorio("CONSULTA") });

    expect(html).not.toContain("Renombrar…");
    expect(html).not.toContain("<form");
    expect(textoDe(html)).toContain("9 domicilios");
  });

  it("una baja rechazada por dependencias dice el motivo y no el formulario", () => {
    const html = render({ accion: "baja", nodos: [laColonia] });

    expect(detallesDe(html, "Dar de baja…")).toContain("Tiene 1 colonia.");
    expect(detallesDe(html, "Dar de baja…")).not.toContain("<form");
  });
});
