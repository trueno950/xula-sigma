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
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
const otraCalleId = comoCalleId("44444444-4444-4444-8444-444444444444");
const domicilioId = comoDomicilioId("55555555-5555-4555-8555-555555555555");
const hermanaId = comoDomicilioId("66666666-6666-4666-8666-666666666666");

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

const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Centro",
    padreId: cabeceraId,
  },
  { clase: "domicilio", id: domicilioId, lugarId: coloniaId },
  { clase: "domicilio", id: hermanaId, lugarId: coloniaId },
];

const base: PropsDeContenido = {
  raizId: cabeceraId,
  lugar: { id: coloniaId, tipo: "colonia", nombre: "Centro" },
  nodos,
  calles: [
    { id: calleId, nombre: "Calle 21", lugarId: cabeceraId, punto: null },
    { id: otraCalleId, nombre: "Calle 22", lugarId: cabeceraId, punto: null },
  ],
  lugares: [{ id: cabeceraId, nombre: "Tepakan", tipo: "cabecera" }],
  domicilios: [
    {
      id: domicilioId,
      calle: "Calle 21",
      calleId,
      numero: "21",
      lugar: "Centro",
    },
    {
      id: hermanaId,
      calle: "Calle 21",
      calleId,
      numero: "22",
      lugar: "Centro",
    },
    {
      id: comoDomicilioId("77777777-7777-4777-8777-777777777777"),
      calle: "Calle 21",
      calleId,
      numero: "21",
      lugar: "Centro",
    },
  ],
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

  it("nombra los domicilios hermanos solo cuando hay otros", () => {
    const conHermana = render({ domicilio, domicilioId });

    expect(conHermana).toContain("Hay 1 domicilio mas en esta direccion");

    const sinHermana = render({
      domicilio,
      domicilioId,
      domicilios: [
        {
          id: domicilioId,
          calle: "Calle 21",
          calleId,
          numero: "21",
          lugar: "Centro",
        },
      ],
    });

    expect(sinHermana).not.toContain("domicilio mas en esta direccion");
  });
});
