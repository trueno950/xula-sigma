import {
  BarraDeAcciones,
  Boton,
  CampoDeLista,
  CLASES_DE_FORMULARIO,
} from "@/shared/ui";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { registrarMudanzaAction } from "./actions/registrarMudanzaAction";

type Props = {
  personaId: string;
  domicilios: readonly DomicilioParaListado[];
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (tasks.md 6.22, mismo reparto que `FormularioDeDomicilio`). `domicilioId`
 * sale de un `<select>` del catalogo del municipio (`listarDomicilios`):
 * el ID crudo no aparece en ningun lado de la UI, asi que pedirlo escrito
 * era un callejon sin salida.
 */
export function FormularioDeMudanza({ personaId, domicilios }: Props) {
  return (
    <form action={registrarMudanzaAction} className={CLASES_DE_FORMULARIO}>
      <input type="hidden" name="personaId" value={personaId} />
      <CampoDeLista
        id="mudanza-domicilio"
        name="domicilioId"
        etiqueta="Domicilio"
        marcador={
          domicilios.length === 0
            ? "Sin domicilios registrados en el municipio"
            : "Elija un domicilio..."
        }
        opciones={domicilios.map((domicilio) => ({
          valor: domicilio.id,
          etiqueta: `${domicilio.lugar} — ${domicilio.calle} ${domicilio.numero ?? "S/N"}`,
        }))}
        {...(domicilios.length === 0
          ? { ayuda: "Primero cree un domicilio desde Territorio." }
          : {})}
      />
      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Registrar mudanza
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
