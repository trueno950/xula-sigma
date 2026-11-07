"use client";

import { type ReactNode, useState, useSyncExternalStore } from "react";
import {
  Campo,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  type OpcionDeLista,
} from "@/shared/ui";
import { callesQueCoinciden, mensajeDeCoincidencias } from "./busquedaDeCalles";
import type { AsentamientoDeCalle } from "./coloniasDelAlta";
import { SelectorDeColonia } from "./SelectorDeColonia";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type PropsDeColonia = {
  id: string;
  name: string;
  nivel: NivelDelFormulario;
  valorInicial: string;
  /** Sin el, la colonia no se acorta por la calle: queda agrupada. */
  asentamientoDeCalle?: AsentamientoDeCalle | undefined;
};

type Props = {
  id: string;
  name: string;
  opciones: readonly OpcionDeLista[];
  marcador: string;
  ayuda: string;
  /** La calle ya guardada, en la correccion: abre con ella elegida. */
  valorInicial?: string | undefined;
  /** Lo que va entre la calle y la colonia (el numero), del servidor. */
  children?: ReactNode;
  colonia?: PropsDeColonia | undefined;
};

const sinSuscripcion = () => () => {};

/**
 * El campo de calle con buscador, como hoja `"use client"` minima: el
 * formulario que lo contiene sigue siendo el `<form action={...}>` nativo
 * del servidor (ver `FormularioDeDomicilio`).
 *
 * Lo que el JavaScript agrega es acortar la lista, y solo eso. El `<select>`
 * sale completo en el HTML del servidor y sigue siendo el campo que viaja en
 * el POST: si el script no carga, la calle se elige igual desde la lista
 * entera, que es el caso de la red movil rural de `PRODUCT.md`. El buscador
 * no lleva `name`, asi que nunca se envia como un campo mas.
 *
 * La colonia vive en la misma hoja porque depende de la calle elegida: con
 * JavaScript se acorta al asentamiento de esa calle. El HTML del servidor y
 * el primer render del cliente la pintan agrupada -`useSyncExternalStore`
 * con `false` del lado del servidor-, asi la hidratacion coincide y el
 * camino sin script queda igual.
 */
export function SelectorDeCalleConBusqueda({
  id,
  name,
  opciones,
  marcador,
  ayuda,
  valorInicial,
  children,
  colonia,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [elegida, setElegida] = useState(valorInicial ?? "");
  const [zona, setZona] = useState(colonia?.valorInicial ?? "");
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
  const visibles = callesQueCoinciden(opciones, busqueda, elegida);
  const asentamiento = hidratado
    ? colonia?.asentamientoDeCalle?.[elegida]
    : undefined;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Campo
          id={`${id}-busqueda`}
          etiqueta="Buscar calle"
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          aria-controls={id}
          ayuda="Escriba parte del nombre para acortar la lista."
        />
        <CampoDeLista
          id={id}
          name={name}
          etiqueta="Calle"
          marcador={marcador}
          opciones={visibles}
          ayuda={ayuda}
          defaultValue={valorInicial ?? ""}
          onChange={(evento) => setElegida(evento.target.value)}
        />
        {busqueda.trim() ? (
          <p role="status" className={CLASES_DE_ETIQUETA}>
            {mensajeDeCoincidencias(visibles.length)}
          </p>
        ) : null}
      </div>
      {children}
      {colonia ? (
        <SelectorDeColonia
          // Remonta al cambiar de asentamiento: el `defaultValue` vuelve a
          // aplicarse sobre la lista nueva.
          key={asentamiento?.id ?? "todas"}
          id={colonia.id}
          name={colonia.name}
          nivel={colonia.nivel}
          asentamiento={asentamiento}
          defaultValue={zona}
          onChange={(evento) => setZona(evento.target.value)}
        />
      ) : null}
    </>
  );
}
