"use client";

import { useState } from "react";
import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { CampoDeLista, type OpcionDeLista } from "./CampoDeLista";
import {
  cambiarConsultaDeDireccion,
  crearEstadoInicialDeDireccion,
  limpiarSeleccionDeDireccion,
  type OpcionDeDireccion,
  seleccionarDireccion,
} from "./seleccionDeDireccion";
import type { AccionDeBusqueda } from "./useBusquedaDeDirecciones";
import { useBusquedaDeDirecciones } from "./useBusquedaDeDirecciones";

type Props<T extends OpcionDeDireccion> = {
  id: string;
  nombre: string;
  buscar: AccionDeBusqueda<T>;
  onSeleccionar?: (direccion: T | null) => void;
};

/** Buscador de direcciones por texto, sin conocer de qué módulo vienen. */
export function SelectorDeDireccion<T extends OpcionDeDireccion>({
  id,
  nombre,
  buscar,
  onSeleccionar,
}: Props<T>) {
  const [estado, setEstado] = useState(() =>
    crearEstadoInicialDeDireccion<T>(),
  );
  const busqueda = useBusquedaDeDirecciones(estado.consulta, buscar);
  const opciones: readonly OpcionDeLista[] = busqueda.opciones.map(
    (direccion) => ({ valor: direccion.id, etiqueta: direccion.etiqueta }),
  );

  const cambiarConsulta = (consulta: string) => {
    setEstado((actual) => cambiarConsultaDeDireccion(actual, consulta));
    onSeleccionar?.(null);
  };

  const seleccionar = (idSeleccionado: string) => {
    const direccion =
      busqueda.opciones.find((opcion) => opcion.id === idSeleccionado) ?? null;
    setEstado((actual) => seleccionarDireccion(actual, direccion));
    onSeleccionar?.(direccion);
  };

  const limpiar = () => {
    setEstado((actual) => limpiarSeleccionDeDireccion(actual));
    onSeleccionar?.(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Campo
        id={`${id}-consulta`}
        type="search"
        etiqueta="Buscar una dirección registrada"
        maxLength={120}
        autoComplete="off"
        value={estado.consulta}
        onChange={(evento) => cambiarConsulta(evento.target.value)}
        ayuda="Busque por calle, número, colonia o asentamiento. Escriba al menos dos caracteres."
      />

      {busqueda.estado === "cargando" ? (
        <p role="status" className="text-[13px] text-caliza-apagada">
          Buscando direcciones registradas...
        </p>
      ) : null}
      {busqueda.estado === "sin-resultados" ? (
        <p role="status" className="text-[13px] text-caliza-apagada">
          No se encontraron direcciones. Puede indicar lugar y calle.
        </p>
      ) : null}
      {busqueda.estado === "error" ? (
        <p role="alert" className="text-[13px] text-senial-error">
          {busqueda.mensaje ??
            "No se pudo buscar direcciones. Puede indicar lugar y calle."}
        </p>
      ) : null}

      {opciones.length > 0 || estado.seleccionada ? (
        <CampoDeLista
          key={`${estado.consulta}:${estado.seleccionada?.id ?? ""}`}
          id={`${id}-opcion`}
          etiqueta="Dirección para el reporte"
          marcador="Seleccione una dirección"
          opcional
          opciones={opciones}
          defaultValue={estado.seleccionada?.id ?? ""}
          onChange={(evento) => seleccionar(evento.target.value)}
        />
      ) : null}

      {busqueda.hayMas ? (
        <p role="status" className="text-[13px] text-caliza-apagada">
          Hay más direcciones. Escriba más caracteres para precisar la búsqueda.
        </p>
      ) : null}

      {estado.seleccionada ? (
        <input type="hidden" name={nombre} value={estado.seleccionada.id} />
      ) : null}

      {estado.consulta || estado.seleccionada ? (
        <Boton type="button" variante="fantasma" onClick={limpiar}>
          Limpiar búsqueda
        </Boton>
      ) : null}
    </div>
  );
}
