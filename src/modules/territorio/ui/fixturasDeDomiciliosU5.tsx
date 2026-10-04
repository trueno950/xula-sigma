import { renderToStaticMarkup } from "react-dom/server";
import type { NodoDeSubarbol } from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";

export const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
export const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
export const manzanaId = comoLugarId("88888888-8888-4888-8888-888888888888");
export const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
export const enColoniaId = comoDomicilioId(
  "55555555-5555-4555-8555-555555555555",
);
export const enManzanaId = comoDomicilioId(
  "99999999-9999-4999-8999-999999999999",
);

export const guardado = (
  id: typeof enColoniaId,
  lugarId: typeof coloniaId,
  numero: string | null,
): DomicilioGuardado => ({
  id,
  lugarId,
  calleId,
  numero,
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: null,
  bajaEn: null,
});

export const nodos: readonly NodoDeSubarbol[] = [
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
    id: enColoniaId,
    lugarId: coloniaId,
    calleId,
    calle: "Calle 21",
    numero: "21",
  },
  {
    clase: "domicilio",
    id: enManzanaId,
    lugarId: manzanaId,
    calleId,
    calle: "Calle 30",
    numero: null,
  },
];

export const base: PropsDeContenido = {
  raizId: cabeceraId,
  lugar: { id: coloniaId, tipo: "colonia", nombre: "Centro" },
  nodos,
  calles: [
    { id: calleId, nombre: "Calle 21", lugarId: cabeceraId, punto: null },
  ],
  lugares: [{ id: cabeceraId, nombre: "Tepakan", tipo: "cabecera" }],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

export const render = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(<TabDeDomicilios {...base} {...resto} />);

export const seleccionado = (resto: Partial<PropsDeContenido> = {}) =>
  render({
    domicilio: guardado(enColoniaId, coloniaId, "21"),
    domicilioId: enColoniaId,
    ...resto,
  });

export const detalles = (html: string) => html.match(/<details[^>]*>/g) ?? [];
