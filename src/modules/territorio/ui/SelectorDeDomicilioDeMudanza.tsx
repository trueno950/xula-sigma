"use client";

import { useSyncExternalStore } from "react";
import {
  CampoDeLista,
  type OpcionDeLista,
  SelectorDeDireccion,
} from "@/shared/ui";
import { buscarDomiciliosAction } from "./actions/buscarDomiciliosAction";

type Props = {
  domicilios: readonly OpcionDeLista[];
};

const sinSuscripcion = () => () => {};

/**
 * Isla cliente dentro del `<form>` nativo de `FormularioDeMudanza`: solo
 * escribe el `domicilioId` oculto, el envío sigue siendo el POST del
 * navegador. El buscador aparece recién hidratado -el HTML del servidor no
 * lo trae porque sin JavaScript no respondería- y el `<select>` completo
 * del municipio queda en `<noscript>` como el camino sin JavaScript.
 */
export function SelectorDeDomicilioDeMudanza({ domicilios }: Props) {
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
  const sinDomicilios = domicilios.length === 0;

  return (
    <>
      <noscript>
        <CampoDeLista
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
      </noscript>
      {hidratado ? (
        <SelectorDeDireccion
          id="mudanza-domicilio"
          nombre="domicilioId"
          etiquetaDeLista="Domicilio"
          buscar={buscarDomiciliosAction}
        />
      ) : null}
      {hidratado && sinDomicilios ? (
        <p className="text-[13px] text-caliza-apagada">
          Primero cree un domicilio desde Territorio.
        </p>
      ) : null}
    </>
  );
}
