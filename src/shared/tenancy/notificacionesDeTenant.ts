import postgres from "postgres";
import { datosSegurosDeError } from "../lib/registroDeError";
import { canalDeTenant } from "../notificaciones/canales";
import type { AyuntamientoId } from "./ayuntamientoId";

type Consumidor = (payload: string) => void;
type AvisoDeReconexion = () => void;
type Suscripcion = { cerrar: () => Promise<void> };
type Escucha = {
  consumidor: Consumidor;
  alReconectar: AvisoDeReconexion | undefined;
};

const escuchas = new Map<string, Set<Escucha>>();
const desuscripciones = new Map<string, () => Promise<void>>();
const aperturas = new Map<string, Promise<void>>();
const cierres = new Map<string, Promise<void>>();
let cliente: postgres.Sql | null = null;

function clienteDeEscucha(): postgres.Sql {
  if (cliente) return cliente;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");

  cliente = postgres(url, { max: 1, prepare: false });
  return cliente;
}

/**
 * Un suscriptor que lanza no debe dejar sin entrega a los demas del canal, y
 * la excepcion tampoco puede volver a `postgres`: su re-listen la traga con
 * un `.catch` vacio (`index.js:159`, 3.4.9). Los fallos se registran al
 * terminar la ronda, con el texto fijo y `datosSegurosDeError`, que descarta
 * el mensaje: el de un suscriptor podria traer el payload.
 */
function entregarATodos(
  canal: string,
  entregar: (escucha: Escucha) => void,
): void {
  const fallos: unknown[] = [];
  for (const escucha of escuchas.get(canal) ?? []) {
    try {
      entregar(escucha);
    } catch (error) {
      fallos.push(error);
    }
  }
  for (const fallo of fallos) {
    console.error("[eventos] un suscriptor fallo", datosSegurosDeError(fallo));
  }
}

const reenviar = (canal: string, payload: string) =>
  entregarATodos(canal, ({ consumidor }) => consumidor(payload));

const avisarReconexion = (canal: string) =>
  entregarATodos(canal, ({ alReconectar }) => alReconectar?.());

/**
 * postgres 3.4.9 re-escucha solo tras una caida (`index.js:157-160`) con
 * listeners nuevos, y el `unlisten` que devolvio el primer `listen` ya no
 * los alcanza (`index.js:188`): la escucha vieja sigue registrada. `abierto`
 * la silencia al cerrar el canal para que una reapertura no duplique
 * payloads ni avisos.
 */
async function abrirCanal(canal: string): Promise<void> {
  let abierto = true;
  let esPrimerListen = true;
  const escucha = await clienteDeEscucha().listen(
    canal,
    (payload) => {
      if (abierto) reenviar(canal, payload);
    },
    () => {
      if (abierto && !esPrimerListen) avisarReconexion(canal);
      esPrimerListen = false;
    },
  );
  desuscripciones.set(canal, () => {
    abierto = false;
    return escucha.unlisten();
  });
}

async function asegurarCanal(canal: string): Promise<void> {
  await cierres.get(canal);
  const aperturaEnCurso = aperturas.get(canal);
  if (aperturaEnCurso) return aperturaEnCurso;
  if (desuscripciones.has(canal)) return;

  const apertura = abrirCanal(canal).finally(() => aperturas.delete(canal));
  aperturas.set(canal, apertura);
  return apertura;
}

async function cerrarCanal(canal: string): Promise<void> {
  if (escuchas.get(canal)?.size) return;
  const cierreEnCurso = cierres.get(canal);
  if (cierreEnCurso) return cierreEnCurso;

  const cierre = desuscribirCanal(canal).finally(() => cierres.delete(canal));
  cierres.set(canal, cierre);
  await cierre;
}

async function desuscribirCanal(canal: string): Promise<void> {
  await desuscripciones.get(canal)?.();
  desuscripciones.delete(canal);
  if (!escuchas.get(canal)?.size) escuchas.delete(canal);
}

export async function suscribirActualizaciones(
  ayuntamientoId: AyuntamientoId,
  consumidor: Consumidor,
  alReconectar?: AvisoDeReconexion,
): Promise<Suscripcion> {
  const canal = canalDeTenant(ayuntamientoId);
  const escucha: Escucha = { consumidor, alReconectar };
  const existentes = escuchas.get(canal);

  if (existentes) existentes.add(escucha);
  else {
    escuchas.set(canal, new Set([escucha]));
    try {
      await asegurarCanal(canal);
    } catch (error) {
      escuchas.delete(canal);
      throw error;
    }
  }

  await asegurarCanal(canal);
  return suscripcionPara(canal, escucha);
}

function suscripcionPara(canal: string, escucha: Escucha): Suscripcion {
  let cerrada = false;

  return {
    cerrar: async () => {
      if (cerrada) return;
      cerrada = true;
      await cerrarSuscripcion(canal, escucha);
    },
  };
}

async function cerrarSuscripcion(
  canal: string,
  escucha: Escucha,
): Promise<void> {
  escuchas.get(canal)?.delete(escucha);
  await cerrarCanal(canal);
}

export async function cerrarHubDeNotificaciones(): Promise<void> {
  await Promise.allSettled([...aperturas.values()]);
  await Promise.allSettled([...cierres.values()]);
  const desuscripcionesPendientes = [...desuscripciones.values()];

  try {
    await Promise.all(desuscripcionesPendientes.map((cerrar) => cerrar()));
  } finally {
    escuchas.clear();
    desuscripciones.clear();
    aperturas.clear();
    cierres.clear();
    await cliente?.end();
    cliente = null;
  }
}
