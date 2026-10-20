/**
 * El arbol de prueba que comparten los dos archivos de tests de
 * `contenido.ts`.
 *
 * Vive aparte porque el archivo unico paso las 200 lineas de `AGENTS.md` al
 * sumarle el caso de ciclo, y el corte cae por tema -contar contra
 * seleccionar filas-, no por mitades.
 *
 * Dos niveles despues del corte de `sector`/`manzana`: una cabecera con dos
 * colonias hermanas. La segunda existe para tener un lugar del mismo
 * subarbol que no sea el nodo abierto, que es lo que miraban las manzanas
 * cuando habia tres niveles.
 */
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";

export const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
export const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
export const otraColoniaId = comoLugarId(
  "88888888-8888-4888-8888-888888888888",
);
export const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
export const otraCalleId = comoCalleId("44444444-4444-4444-8444-444444444444");
export const calleDeLaCabeceraId = comoCalleId(
  "99999999-9999-4999-8999-999999999999",
);

export type NodoDomicilio = Extract<NodoDeSubarbol, { clase: "domicilio" }>;

export const nodoDomicilio = (
  id: string,
  lugarId: typeof coloniaId,
  resto: Partial<NodoDomicilio> = {},
): NodoDomicilio => ({
  clase: "domicilio",
  id: comoDomicilioId(id),
  lugarId,
  calleId,
  calle: "Calle 21",
  numero: "5",
  ...resto,
});

export const enColonia = nodoDomicilio(
  "55555555-5555-4555-8555-555555555555",
  coloniaId,
);
export const hermano = nodoDomicilio(
  "66666666-6666-4666-8666-666666666666",
  coloniaId,
);
export const enOtraColonia = nodoDomicilio(
  "77777777-7777-4777-8777-777777777777",
  otraColoniaId,
  { numero: "9" },
);

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
    id: otraColoniaId,
    tipo: "colonia",
    nombre: "Norte",
    padreId: cabeceraId,
  },
  enColonia,
  hermano,
  enOtraColonia,
];

export const cabecera = {
  id: cabeceraId,
  tipo: "cabecera",
  nombre: "Tepakan",
} as const;

export const colonia = {
  id: coloniaId,
  tipo: "colonia",
  nombre: "Centro",
} as const;

export const calleDeLaColonia = { id: calleId, lugarId: coloniaId } as const;
export const calleDeLaOtraColonia = {
  id: otraCalleId,
  lugarId: otraColoniaId,
} as const;
export const calleDeLaCabecera = {
  id: calleDeLaCabeceraId,
  lugarId: cabeceraId,
} as const;
