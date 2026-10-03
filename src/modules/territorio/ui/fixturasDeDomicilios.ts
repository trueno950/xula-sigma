import type { NodoDeSubarbol } from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";

export const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
export const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
export const manzanaId = comoLugarId("88888888-8888-4888-8888-888888888888");
export const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
export const otraCalleId = comoCalleId("44444444-4444-4444-8444-444444444444");
export const domicilioId = comoDomicilioId(
  "55555555-5555-4555-8555-555555555555",
);
export const hermanaId = comoDomicilioId(
  "66666666-6666-4666-8666-666666666666",
);
export const vecinaId = comoDomicilioId("77777777-7777-4777-8777-777777777777");
export const hermanaEnManzanaId = comoDomicilioId(
  "99999999-9999-4999-8999-999999999999",
);

export const domicilio: DomicilioGuardado = {
  id: domicilioId,
  lugarId: coloniaId,
  calleId,
  numero: "21",
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: "Porton azul",
  bajaEn: null,
};

export const enLaMismaDireccion: NodoDeSubarbol = {
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
export const enElMismoNumeroDeOtraCalle: NodoDeSubarbol = {
  clase: "domicilio",
  id: vecinaId,
  lugarId: coloniaId,
  calleId: otraCalleId,
  calle: "Calle 21",
  numero: "21",
};

/** Otro hermano, en una manzana distinta a la del panel abierto. */
export const enOtraManzana: NodoDeSubarbol = {
  clase: "domicilio",
  id: hermanaEnManzanaId,
  lugarId: manzanaId,
  calleId,
  calle: "Calle 21",
  numero: "21",
};

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
    id: domicilioId,
    lugarId: coloniaId,
    calleId,
    calle: "Calle 21",
    numero: "21",
  },
  enLaMismaDireccion,
  enElMismoNumeroDeOtraCalle,
];

export const base: PropsDeContenido = {
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
