import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const manzanaId = comoLugarId("88888888-8888-4888-8888-888888888888");
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
const otraCalleId = comoCalleId("44444444-4444-4444-8444-444444444444");
const domicilioId = comoDomicilioId("55555555-5555-4555-8555-555555555555");
const hermanaId = comoDomicilioId("66666666-6666-4666-8666-666666666666");
const vecinaId = comoDomicilioId("77777777-7777-4777-8777-777777777777");
const hermanaEnManzanaId = comoDomicilioId(
  "99999999-9999-4999-8999-999999999999",
);

const domicilio: DomicilioGuardado = {
  id: domicilioId,
  lugarId: coloniaId,
  calleId,
  numero: "21",
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: "Porton azul",
  bajaEn: null,
};

const enLaMismaDireccion: NodoDeSubarbol = {
  clase: "domicilio",
  id: hermanaId,
  lugarId: coloniaId,
  calleId,
  calle: "Calle 21",
  numero: "21",
};

/**
 * Mismo nombre de calle y mismo numero, otra calle. Dos calles del mismo
 * nombre conviven en un lugar cuando una quedo de baja:
 * `calles_tenant_lugar_nombre_idx` es un unico parcial sobre
 * `baja_en IS NULL`. La identidad la da el id, no el nombre.
 */
const enElMismoNumeroDeOtraCalle: NodoDeSubarbol = {
  clase: "domicilio",
  id: vecinaId,
  lugarId: coloniaId,
  calleId: otraCalleId,
  calle: "Calle 21",
  numero: "21",
};

/** Otro hermano, en una manzana distinta a la del panel abierto. */
const enOtraManzana: NodoDeSubarbol = {
  clase: "domicilio",
  id: hermanaEnManzanaId,
  lugarId: manzanaId,
  calleId,
  calle: "Calle 21",
  numero: "21",
};

const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Centro",
    padreId: cabeceraId,
  },
  {
    clase: "lugar",
    id: manzanaId,
    tipo: "manzana",
    nombre: "Manzana 1",
    padreId: coloniaId,
  },
  {
    clase: "domicilio",
    id: domicilioId,
    lugarId: coloniaId,
    calleId,
    calle: "Calle 21",
    numero: "21",
  },
  enLaMismaDireccion,
  enElMismoNumeroDeOtraCalle,
];

const base: PropsDeContenido = {
  raizId: cabeceraId,
  lugar: { id: coloniaId, tipo: "colonia", nombre: "Centro" },
  nodos,
  calles: [
    { id: calleId, nombre: "Calle 21", lugarId: cabeceraId, punto: null },
    { id: otraCalleId, nombre: "Calle 21", lugarId: cabeceraId, punto: null },
  ],
  lugares: [{ id: cabeceraId, nombre: "Tepakan", tipo: "cabecera" }],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(<TabDeDomicilios {...base} {...resto} />);

describe("domicilios: fila y panel", () => {
  it("la fila de un domicilio enlaza a su panel", () => {
    const html = render();

    expect(html).toContain(`domicilio=${domicilioId}`);
  });

  it("la fila se arma con la calle y el numero del nodo del subarbol", () => {
    const html = render();

    expect(html).toContain("Calle 21 21");
    expect(html).toContain("Centro");
  });

  it("el panel muestra los datos y las dos acciones", () => {
    const html = render({ domicilio, domicilioId });

    expect(html).toContain("Calle 21 21");
    expect(html).toContain("Porton azul");
    expect(html).toContain("Corregir");
    expect(html).toContain("Dar de baja");
    expect(html).toContain(`accion=corregirDomicilio`);
  });

  it("la baja vive dentro del details y no abierta", () => {
    const html = render({ domicilio, domicilioId });
    const antesDelDetails = html.slice(0, html.indexOf("<details"));

    expect(html).toContain("<details>");
    expect(antesDelDetails).not.toContain("Dar de baja");
  });

  it("un rol sin escritura ve el panel sin acciones", () => {
    const html = render({
      domicilio,
      domicilioId,
      permisos: permisosDeTerritorio("CONSULTA"),
    });

    expect(html).toContain("Calle 21 21");
    expect(html).not.toContain("Corregir");
    expect(html).not.toContain("Dar de baja");
  });

  /**
   * Los hermanos salen del subarbol que la pantalla ya trae, no del listado
   * plano del municipio (A1b-GREEN-03). Todo domicilio de una calle cuelga
   * del subarbol del asentamiento de esa calle
   * (`verificacionDeDomicilio.ts`, `exigirCallesDelAsentamiento`).
   */
  it("nombra los domicilios hermanos que estan en el subarbol", () => {
    expect(render({ domicilio, domicilioId })).toContain(
      "Hay 1 domicilio mas en esta direccion",
    );
  });

  it("no llama hermano al mismo numero de otra calle con el mismo nombre", () => {
    const html = render({ domicilio, domicilioId });
    const hermanos = html.slice(html.indexOf("en esta direccion"));

    expect(hermanos).not.toContain(`domicilio=${vecinaId}`);
  });

  it("enlaza a un hermano de otra manzana con el lugar del hermano, no el del panel abierto", () => {
    const html = render({
      domicilio,
      domicilioId,
      nodos: [...nodos, enOtraManzana],
    });
    const inicioDelLink = html.indexOf(`domicilio=${hermanaEnManzanaId}`);
    const href = html.slice(Math.max(0, inicioDelLink - 100), inicioDelLink);

    expect(href).toContain(`nodo=${manzanaId}`);
  });

  it("sin otro domicilio en la misma direccion no dice nada", () => {
    const html = render({
      domicilio,
      domicilioId,
      nodos: nodos.filter((nodo) => nodo.id !== hermanaId),
    });

    expect(html).not.toContain("domicilio mas en esta direccion");
  });
});
