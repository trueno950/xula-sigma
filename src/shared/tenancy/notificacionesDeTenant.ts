import postgres from "postgres";
import { canalDeTenant } from "../notificaciones/canales";
import type { AyuntamientoId } from "./ayuntamientoId";

type Consumidor = (payload: string) => void;
type Suscripcion = { cerrar: () => Promise<void> };

const escuchas = new Map<string, Set<Consumidor>>();
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

const reenviar = (canal: string, payload: string) => {
  for (const consumidor of escuchas.get(canal) ?? []) consumidor(payload);
};

async function abrirCanal(canal: string): Promise<void> {
  const escucha = await clienteDeEscucha().listen(canal, (payload) =>
    reenviar(canal, payload),
  );
  desuscripciones.set(canal, () => escucha.unlisten());
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
): Promise<Suscripcion> {
  const canal = canalDeTenant(ayuntamientoId);
  const existentes = escuchas.get(canal);

  if (existentes) existentes.add(consumidor);
  else {
    escuchas.set(canal, new Set([consumidor]));
    try {
      await asegurarCanal(canal);
    } catch (error) {
      escuchas.delete(canal);
      throw error;
    }
  }

  await asegurarCanal(canal);
  return suscripcionPara(canal, consumidor);
}

function suscripcionPara(canal: string, consumidor: Consumidor): Suscripcion {
  let cerrada = false;

  return {
    cerrar: async () => {
      if (cerrada) return;
      cerrada = true;
      await cerrarSuscripcion(canal, consumidor);
    },
  };
}

async function cerrarSuscripcion(
  canal: string,
  consumidor: Consumidor,
): Promise<void> {
  escuchas.get(canal)?.delete(consumidor);
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
