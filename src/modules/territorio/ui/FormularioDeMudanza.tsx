import { MapPin } from "@phosphor-icons/react/ssr";
import {
  BarraDeAcciones,
  Boton,
  CLASES_DE_FORMULARIO,
  EnlaceDeAccion,
} from "@/shared/ui";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { etiquetaDeDomicilio } from "../domain";
import { registrarMudanzaAction } from "./actions/registrarMudanzaAction";
import { enlaceDeAltaDesdeFicha } from "./regresoAFicha";
import { SelectorDeDomicilioDeMudanza } from "./SelectorDeDomicilioDeMudanza";

type Props = {
  personaId: string;
  domicilios: readonly DomicilioParaListado[];
  textoDeEnvio: string;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (tasks.md 6.22, mismo reparto que `FormularioDeDomicilio`). `domicilioId`
 * lo escribe `SelectorDeDomicilioDeMudanza`, que explica su respaldo.
 * El ID crudo no aparece en ningun lado de la UI, asi que pedirlo escrito
 * era un callejon sin salida.
 */
export function FormularioDeMudanza({
  personaId,
  domicilios,
  textoDeEnvio,
}: Props) {
  return (
    <form action={registrarMudanzaAction} className={CLASES_DE_FORMULARIO}>
      <input type="hidden" name="personaId" value={personaId} />
      <SelectorDeDomicilioDeMudanza
        domicilios={domicilios.map((domicilio) => ({
          valor: domicilio.id,
          etiqueta: etiquetaDeDomicilio(domicilio),
        }))}
      />
      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          {textoDeEnvio}
        </Boton>
        <EnlaceDeAccion
          href={enlaceDeAltaDesdeFicha(personaId)}
          variante="secundaria"
        >
          <MapPin size={18} weight="bold" aria-hidden="true" />
          Registrar un domicilio nuevo
        </EnlaceDeAccion>
      </BarraDeAcciones>
    </form>
  );
}
