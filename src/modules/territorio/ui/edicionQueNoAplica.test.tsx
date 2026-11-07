import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeEdicion } from "./TabDeEdicion";

vi.mock("./actions/darDeBajaLugarAction", () => ({
  darDeBajaLugarAction: vi.fn(),
}));
vi.mock("./actions/reparentearLugarAction", () => ({
  reparentearLugarAction: vi.fn(),
}));
vi.mock("./actions/editarLugarAction", () => ({
  editarLugarAction: vi.fn(),
}));

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const comisariaId = comoLugarId("33333333-3333-4333-8333-333333333333");

const cabecera = { id: cabeceraId, tipo: "cabecera", nombre: "Motul" } as const;
const colonia = { id: coloniaId, tipo: "colonia", nombre: "Centro" } as const;
const comisaria = {
  id: comisariaId,
  tipo: "comisaria",
  nombre: "Kiní",
} as const;

const hijoDe = (id: string, padreId = cabeceraId): NodoDeSubarbol => ({
  clase: "lugar",
  id: comoLugarId(id),
  tipo: "colonia",
  nombre: `Colonia ${id.slice(0, 2)}`,
  padreId,
});

const coloniaEnCabecera = hijoDe(coloniaId);

const htmlDe = (props: Partial<PropsDeContenido>) =>
  renderToStaticMarkup(
    <TabDeEdicion
      raizId={cabeceraId}
      lugar={cabecera}
      nodos={[]}
      calles={[]}
      lugares={[cabecera, comisaria]}
      calleId={undefined}
      domicilio={undefined}
      domicilioId={undefined}
      accion={undefined}
      permisos={permisosDeTerritorio("ADMIN_MUNICIPAL")}
      conteos={[]}
      {...props}
    />,
  );

describe("la baja de un lugar que la rechazaria", () => {
  it("con domicilios no se ofrece: dice cuantos y que hacer", () => {
    const html = htmlDe({
      accion: "baja",
      conteos: [{ lugarId: cabeceraId, domicilios: 11, calles: 0 }],
    });

    expect(html).toContain("Tiene 11 domicilios. Muévalos primero.");
    expect(html).not.toContain("accion=baja");
    expect(html).not.toContain("Dar de baja Motul");
  });

  it("con colonias adentro no se ofrece, y lo dice", () => {
    const html = htmlDe({
      accion: "baja",
      nodos: [
        hijoDe("44444444-4444-4444-8444-444444444444"),
        coloniaEnCabecera,
      ],
    });

    expect(html).toContain("Tiene 2 colonias.");
    expect(html).not.toContain("Dar de baja Motul");
  });

  it("con calles o zonas activas no se ofrece", () => {
    const conCalle = htmlDe({
      accion: "baja",
      calles: [
        {
          id: comoCalleId("55555555-5555-4555-8555-555555555555"),
          nombre: "Calle 21",
          lugarId: cabeceraId,
          punto: null,
        },
      ],
    });
    const conZonas = htmlDe({ accion: "baja", zonasDelLugar: 2 });

    expect(conCalle).toContain("Tiene 1 calle.");
    expect(conCalle).not.toContain("Dar de baja Motul");
    expect(conZonas).toContain("Tiene 2 zonas.");
    expect(conZonas).not.toContain("Dar de baja Motul");
  });

  it("vacio se sigue ofreciendo, con su formulario", () => {
    const html = htmlDe({ accion: "baja", zonasDelLugar: 0 });

    expect(html).toContain("accion=baja");
    expect(html).toContain("Dar de baja Motul");
  });

  it("si las cuentas no cargaron, la baja sigue y decide el servidor", () => {
    const html = htmlDe({ accion: "baja", conteos: undefined });

    expect(html).toContain("Dar de baja Motul");
  });
});

describe("Mover un lugar", () => {
  it("una cabecera sin padre no tiene a donde ir: no se ofrece", () => {
    const html = htmlDe({ accion: "reparentear" });

    expect(html).not.toContain("accion=reparentear");
    expect(html).not.toContain("Mover lugar");
  });

  it("una colonia con domicilios no cambia de asentamiento: lo explica", () => {
    const html = htmlDe({
      lugar: colonia,
      nodos: [coloniaEnCabecera],
      accion: "reparentear",
      conteos: [{ lugarId: coloniaId, domicilios: 3, calles: null }],
    });

    expect(html).toContain(
      "Tiene 3 domicilios y no puede cambiar de asentamiento.",
    );
    expect(html).not.toContain("accion=reparentear");
    expect(html).not.toContain("Mover lugar");
  });

  it("una colonia sin otro asentamiento al que ir no se ofrece", () => {
    const html = htmlDe({
      lugar: colonia,
      nodos: [coloniaEnCabecera],
      lugares: [cabecera, colonia],
    });

    expect(html).not.toContain("accion=reparentear");
  });

  it("una colonia vacia con otro asentamiento se sigue moviendo", () => {
    const html = htmlDe({
      lugar: colonia,
      nodos: [coloniaEnCabecera],
      accion: "reparentear",
      conteos: [{ lugarId: coloniaId, domicilios: 0, calles: null }],
    });

    expect(html).toContain("accion=reparentear");
    expect(html).toContain("Mover lugar");
    expect(html).toContain("Kiní");
    expect(html).not.toContain(`<option value="${cabeceraId}"`);
  });
});
