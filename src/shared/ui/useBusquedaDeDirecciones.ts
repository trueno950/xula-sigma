"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import type { OpcionDeDireccion } from "./seleccionDeDireccion";

export const MINIMO_DE_CARACTERES_PARA_BUSCAR = 2;
export const RETARDO_DE_BUSQUEDA_MS = 250;

export type RespuestaDeBusqueda<T extends OpcionDeDireccion> =
  | {
      ok: true;
      data: { opciones: readonly T[]; hayMas: boolean };
    }
  | { ok: false; mensaje: string };

export type AccionDeBusqueda<T extends OpcionDeDireccion> = (criterio: {
  consulta: string;
}) => Promise<RespuestaDeBusqueda<T>>;

type EstadoDeBusqueda<T extends OpcionDeDireccion> = {
  consulta: string;
  estado: "inicial" | "cargando" | "resultados" | "sin-resultados" | "error";
  opciones: readonly T[];
  hayMas: boolean;
  mensaje?: string;
};

type ActualizarEstado<T extends OpcionDeDireccion> = Dispatch<
  SetStateAction<EstadoDeBusqueda<T>>
>;

const estadoInicial = <T extends OpcionDeDireccion>(
  consulta: string,
): EstadoDeBusqueda<T> => ({
  consulta,
  estado: "inicial",
  opciones: [],
  hayMas: false,
});

const estadoDeCarga = <T extends OpcionDeDireccion>(
  consulta: string,
): EstadoDeBusqueda<T> => ({
  consulta,
  estado: "cargando",
  opciones: [],
  hayMas: false,
});

const estadoDeError = <T extends OpcionDeDireccion>(
  consulta: string,
  mensaje: string,
): EstadoDeBusqueda<T> => ({
  consulta,
  estado: "error",
  opciones: [],
  hayMas: false,
  mensaje,
});

type ConsultaPendiente<T extends OpcionDeDireccion> = {
  consulta: string;
  buscar: AccionDeBusqueda<T>;
  sigueVigente: () => boolean;
  actualizar: ActualizarEstado<T>;
};

const resolverBusqueda = async <T extends OpcionDeDireccion>({
  consulta,
  buscar,
  sigueVigente,
  actualizar,
}: ConsultaPendiente<T>): Promise<void> => {
  try {
    const resultado = await buscar({ consulta });
    if (!sigueVigente()) return;
    if (!resultado.ok) {
      actualizar(estadoDeError<T>(consulta, resultado.mensaje));
      return;
    }

    actualizar({
      consulta,
      estado:
        resultado.data.opciones.length > 0 ? "resultados" : "sin-resultados",
      opciones: resultado.data.opciones,
      hayMas: resultado.data.hayMas,
    });
  } catch {
    if (!sigueVigente()) return;
    actualizar(
      estadoDeError<T>(
        consulta,
        "No se pudo buscar direcciones. Puede indicar lugar y calle.",
      ),
    );
  }
};

type ConsultaProgramada<T extends OpcionDeDireccion> = Omit<
  ConsultaPendiente<T>,
  "sigueVigente"
> & { secuencia: { current: number } };

function programarBusqueda<T extends OpcionDeDireccion>({
  consulta,
  buscar,
  actualizar,
  secuencia,
}: ConsultaProgramada<T>) {
  const idDeSolicitud = ++secuencia.current;
  const sigueVigente = () => secuencia.current === idDeSolicitud;
  if (consulta.length < MINIMO_DE_CARACTERES_PARA_BUSCAR) {
    actualizar(estadoInicial<T>(consulta));
    return () => {
      if (sigueVigente()) secuencia.current += 1;
    };
  }
  actualizar(estadoDeCarga<T>(consulta));
  const temporizador = window.setTimeout(
    () => void resolverBusqueda({ consulta, buscar, sigueVigente, actualizar }),
    RETARDO_DE_BUSQUEDA_MS,
  );
  return () => {
    window.clearTimeout(temporizador);
    if (sigueVigente()) secuencia.current += 1;
  };
}

export function useBusquedaDeDirecciones<T extends OpcionDeDireccion>(
  consulta: string,
  buscar: AccionDeBusqueda<T>,
): EstadoDeBusqueda<T> {
  const normalizada = consulta.trim();
  const secuencia = useRef(0);
  const [estado, setEstado] = useState<EstadoDeBusqueda<T>>(() =>
    estadoInicial<T>(""),
  );

  useEffect(
    () =>
      programarBusqueda({
        consulta: normalizada,
        buscar,
        actualizar: setEstado,
        secuencia,
      }),
    [normalizada, buscar],
  );

  if (estado.consulta === normalizada) return estado;
  if (normalizada.length < MINIMO_DE_CARACTERES_PARA_BUSCAR) {
    return estadoInicial<T>(normalizada);
  }
  return estadoDeCarga<T>(normalizada);
}
