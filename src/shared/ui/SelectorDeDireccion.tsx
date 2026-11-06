"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { CampoDeLista, type OpcionDeLista } from "./CampoDeLista";
import {
  cambiarConsultaDeDireccion,
  crearEstadoInicialDeDireccion,
  type EstadoDeSeleccionDeDireccion,
  limpiarSeleccionDeDireccion,
  mensajeDeValidezDeDireccion,
  type OpcionDeDireccion,
  seleccionarDireccion,
} from "./seleccionDeDireccion";
import {
  type ConfiguracionDeTextos,
  textosDeSeleccionDeDireccion,
} from "./textosDeSeleccionDeDireccion";
import type { AccionDeBusqueda } from "./useBusquedaDeDirecciones";
import { useBusquedaDeDirecciones } from "./useBusquedaDeDirecciones";

type Props<T extends OpcionDeDireccion> = ConfiguracionDeTextos & {
  id: string;
  nombre: string;
  buscar: AccionDeBusqueda<T>;
  onSeleccionar?: (direccion: T | null) => void;
  /** Sin direccion elegida, el navegador no envia el formulario. */
  requerido?: boolean;
};

/**
 * El campo oculto con el id solo existe con una direccion elegida, y un
 * `hidden` no admite `required`: la validez se cuelga del buscador, que es
 * donde el navegador puede enfocar y mostrar el mensaje.
 */
const useValidezDeDireccion = <T extends OpcionDeDireccion>(
  estado: EstadoDeSeleccionDeDireccion<T>,
  requerido: boolean,
) => {
  const buscador = useRef<HTMLInputElement>(null);
  const mensaje = mensajeDeValidezDeDireccion(estado, requerido);

  useEffect(() => {
    buscador.current?.setCustomValidity(mensaje);
  }, [mensaje]);

  return buscador;
};

/** Buscador de direcciones por texto, sin conocer de qué módulo vienen. */
export function SelectorDeDireccion<T extends OpcionDeDireccion>({
  id,
  nombre,
  buscar,
  onSeleccionar,
  etiquetaDeLista,
  alternativa,
  requerido = false,
}: Props<T>) {
  const [estado, setEstado] = useState(() =>
    crearEstadoInicialDeDireccion<T>(),
  );
  const buscador = useValidezDeDireccion(estado, requerido);
  const textos = textosDeSeleccionDeDireccion({
    etiquetaDeLista,
    ...(alternativa ? { alternativa } : {}),
  });
  const busqueda = useBusquedaDeDirecciones(
    estado.consulta,
    buscar,
    textos.fallo,
  );
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
        ref={buscador}
        id={`${id}-consulta`}
        type="search"
        required={requerido}
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
          {textos.sinResultados}
        </p>
      ) : null}
      {busqueda.estado === "error" ? (
        <p role="alert" className="text-[13px] text-senial-error">
          {busqueda.mensaje ?? textos.fallo}
        </p>
      ) : null}

      {opciones.length > 0 || estado.seleccionada ? (
        <CampoDeLista
          key={`${estado.consulta}:${estado.seleccionada?.id ?? ""}`}
          id={`${id}-opcion`}
          etiqueta={textos.etiquetaDeLista}
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
