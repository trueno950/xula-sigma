"use client";

import { CaretDown } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";
import {
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  type OpcionDeLista,
} from "@/shared/ui";
import {
  type CallesDelAlta,
  callesAOfrecer,
  type GrupoDeCalles,
} from "./FormularioDeAltaDeIntervencion.calles";

const opcionesDe = (opciones: readonly OpcionDeLista[]) =>
  opciones.map((opcion) => (
    <option key={opcion.valor} value={opcion.valor}>
      {opcion.etiqueta}
    </option>
  ));

const gruposDe = (grupos: readonly GrupoDeCalles[]) =>
  grupos.map((grupo) => (
    <optgroup key={grupo.asentamientoId} label={grupo.asentamiento}>
      {opcionesDe(grupo.opciones)}
    </optgroup>
  ));

/**
 * El campo de Calle del alta, como hoja `"use client"` minima: el `<form
 * action={...}>` que lo contiene sigue siendo el POST nativo del servidor, y
 * esta hoja no lo toca ni dibuja ningun otro campo. Que calles se ofrecen lo
 * decide `callesAOfrecer`.
 *
 * Lo que el JavaScript agrega es acortar la lista, y solo eso. El `<select>`
 * sale completo en el HTML del servidor, agrupado por asentamiento, y sigue
 * siendo el campo que viaja en el POST: si el script no carga, la calle se
 * elige igual desde la lista entera, que es el caso de la red movil rural de
 * `PRODUCT.md`.
 *
 * Escucha los eventos `change` e `input` del `<form>` que la contiene y lee
 * `new FormData(formulario)`, mismo mecanismo que `MuestraDeColores`: el lugar
 * elegido se lee del formulario, no de una segunda copia del estado que podria
 * divergir. El `key` del `<select>` lo remonta cuando cambia el asentamiento,
 * asi una calle elegida para el lugar anterior no se envia como si fuera de
 * este.
 */
export function SelectorDeCalleDelLugar({ calles }: { calles: CallesDelAlta }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [lugarId, setLugarId] = useState("");

  useEffect(() => {
    const formulario = contenedor.current?.closest("form");

    if (!formulario) return;

    const leerLugar = () => {
      const valor = new FormData(formulario).get("lugarId");
      setLugarId(typeof valor === "string" ? valor : "");
    };

    formulario.addEventListener("change", leerLugar);
    formulario.addEventListener("input", leerLugar);

    return () => {
      formulario.removeEventListener("change", leerLugar);
      formulario.removeEventListener("input", leerLugar);
    };
  }, []);

  const oferta = callesAOfrecer(calles, lugarId);
  const clave = lugarId
    ? (calles.asentamientoDeLugar[lugarId] ?? "sin-asentamiento")
    : "todas";

  return (
    <div ref={contenedor} className="flex flex-col gap-1.5">
      <label htmlFor="intervencion-calle" className={CLASES_DE_ETIQUETA}>
        Calle (opcional)
      </label>
      <div className="relative">
        <select
          key={clave}
          id="intervencion-calle"
          name="calleId"
          defaultValue=""
          className={`${clasesDeCampo()} appearance-none pr-9`}
        >
          <option value="">Sin calle</option>
          {oferta.forma === "grupos"
            ? gruposDe(oferta.grupos)
            : opcionesDe(oferta.opciones)}
        </select>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
        />
      </div>
    </div>
  );
}
