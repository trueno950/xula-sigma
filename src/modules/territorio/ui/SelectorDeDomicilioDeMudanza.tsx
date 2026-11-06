"use client";

import { useEffect, useRef, useState } from "react";
import {
  CampoDeLista,
  type OpcionDeLista,
  SelectorDeDireccion,
} from "@/shared/ui";
import { buscarDomiciliosAction } from "./actions/buscarDomiciliosAction";

type Props = {
  domicilios: readonly OpcionDeLista[];
};

type Modo = "lista" | "buscador";

/**
 * Isla cliente dentro del `<form>` nativo de `FormularioDeMudanza`: solo
 * escribe el `domicilioId`, el envío sigue siendo el POST del navegador.
 *
 * El HTML inicial trae la lista completa del municipio, que sirve sin
 * JavaScript y mientras el JavaScript todavía no llegó -la red móvil rural
 * de `PRODUCT.md`-. Al montar se cambia al buscador solo si nadie eligió
 * todavía: lo que se eligió antes de hidratar vive en el DOM, no en React,
 * y cambiar de control lo borraría.
 */
export function SelectorDeDomicilioDeMudanza({ domicilios }: Props) {
  const lista = useRef<HTMLSelectElement>(null);
  const [modo, setModo] = useState<Modo>("lista");

  useEffect(() => {
    if (!lista.current?.value) setModo("buscador");
  }, []);

  if (modo === "buscador") {
    return (
      <>
        <SelectorDeDireccion
          id="mudanza-domicilio"
          nombre="domicilioId"
          etiquetaDeLista="Domicilio"
          buscar={buscarDomiciliosAction}
          requerido
        />
        {domicilios.length === 0 ? (
          <p className="text-[13px] text-caliza-apagada">
            Primero cree un domicilio desde Territorio.
          </p>
        ) : null}
      </>
    );
  }

  const sinDomicilios = domicilios.length === 0;

  return (
    <CampoDeLista
      ref={lista}
      id="mudanza-domicilio"
      name="domicilioId"
      etiqueta="Domicilio"
      marcador={
        sinDomicilios
          ? "Sin domicilios registrados en el municipio"
          : "Elija un domicilio..."
      }
      opciones={domicilios}
      {...(sinDomicilios
        ? { ayuda: "Primero cree un domicilio desde Territorio." }
        : {})}
    />
  );
}
