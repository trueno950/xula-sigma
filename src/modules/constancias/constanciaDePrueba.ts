import { altaDePersona } from "@/modules/padron";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  registrarMudanza,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import { crearConfigurarDocumentos } from "./application/configurarDocumentos";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Escenario minimo para `emitirConstancia`, contra Postgres real: una
 * persona con una residencia vigente. Usa los casos de uso de `padron` y
 * `territorio` por su barrel -nunca sus tablas directo-, mismo criterio que
 * `mudanzas.integration.test.ts` (`AGENTS.md` antipatron 8).
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite. Vive al
 * lado de los tests que lo usan, igual que `padron/personaDePrueba.ts`.
 */
export type TitularDePrueba = {
  personaId: string;
  /** La colonia de la que cuelga el domicilio -la necesita el test de reparenteo. */
  lugarId: string;
};

export const titularConResidenciaVigente = async (
  nombres: string,
  contexto: ContextoActual,
): Promise<TitularDePrueba> => {
  const { id: personaId } = await altaDePersona(
    { nombres, primerApellido: "Poot", segundoApellido: null, curp: null },
    contexto,
  );
  // El asentamiento existe para que la colonia tenga padre: `altaDeLugar`
  // rechaza una colonia suelta desde que la regla de raiz del spec
  // `jerarquia-territorial` es ejecutable (`RaizInvalidaError`).
  //
  // Comisaria y no cabecera porque el fixture corre una vez por titular y
  // varios titulares comparten municipio: `lugares_una_cabecera` deja una
  // sola cabecera por ayuntamiento, y no hay tope de comisarias.
  const { id: asentamientoId } = await altaDeLugar(
    { tipo: "comisaria", nombre: `Comisaria de ${nombres}`, padreId: null },
    contexto,
  );
  const { id: lugarId } = await altaDeLugar(
    {
      tipo: "colonia",
      nombre: `Colonia de ${nombres}`,
      padreId: asentamientoId,
    },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: `Calle de ${nombres}`, lugarId },
    contexto,
  );
  const { id: domicilioId } = await altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero: "10",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  );

  await registrarMudanza(personaId, domicilioId, contexto);

  return { personaId, lugarId };
};

/** Bloque de firma minimo, para que `emitirConstancia` no rechace por `DocumentosNoConfiguradosError`. */
export const configurarFirmaDePrueba = (contexto: ContextoActual) =>
  crearConfigurarDocumentos(repositorioDeDocumentosSql)(
    {
      firmanteNombre: "Maria Poot",
      firmanteCargo: "Secretaria Municipal",
      leyendaDePie: "Documento sin validez fiscal.",
    },
    contexto,
  );
