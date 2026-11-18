import { randomUUID } from "node:crypto";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
} from "../domain";
import type { ResidenciaGuardada } from "./puertosDeResidencias";

export const personaUna = randomUUID();
export const personaOtra = randomUUID();
export const domicilioViejo = randomUUID();
export const domicilioNuevo = randomUUID();
export const domicilioAjeno = randomUUID();

export const residencia = ({
  personaId,
  domicilioId,
  desdeEn,
  hastaEn = null,
}: {
  personaId: string;
  domicilioId: string;
  desdeEn: string;
  hastaEn?: string | null;
}): ResidenciaGuardada => ({
  id: comoResidenciaId(randomUUID()),
  personaId,
  domicilioId: comoDomicilioId(domicilioId),
  desdeEn,
  hastaEn,
  creadoEn: new Date(`${desdeEn}T00:00:00Z`),
  domicilio: {
    calleId: comoCalleId(randomUUID()),
    lugarId: comoLugarId(randomUUID()),
    numero: "10",
  },
});

export const partes = (calle: string, ancestros: readonly string[]) => ({
  calle,
  numero: "10",
  entreCalleA: null,
  entreCalleB: null,
  referencia: null,
  ancestros,
});
