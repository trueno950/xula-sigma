"use client";

import { useState } from "react";
import {
  Campo,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  type OpcionDeLista,
} from "@/shared/ui";
import { callesQueCoinciden, mensajeDeCoincidencias } from "./busquedaDeCalles";

type Props = {
  id: string;
  name: string;
  opciones: readonly OpcionDeLista[];
  marcador: string;
  ayuda: string;
  /** La calle ya guardada, en la correccion: abre con ella elegida. */
  valorInicial?: string | undefined;
};

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
 */
export function SelectorDeCalleConBusqueda({
  id,
  name,
  opciones,
  marcador,
  ayuda,
  valorInicial,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [elegida, setElegida] = useState(valorInicial ?? "");
  const visibles = callesQueCoinciden(opciones, busqueda, elegida);

  return (
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
  );
}
