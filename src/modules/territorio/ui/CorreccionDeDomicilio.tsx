import { CLASES_DE_TARJETA } from "@/shared/ui";
import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { LugarId } from "../domain";
import type { BorradorDeDomicilio } from "./borradorDeDomicilio";
import { rutaDe } from "./contenido";
import { FormularioDeCorreccionDeDomicilio } from "./FormularioDeCorreccionDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import {
  ANCLA_DE_CORRECCION,
  direccionDeDomicilio,
  zonaDeCorreccion,
} from "./vistaDeCorreccion";

type Props = {
  raizId: LugarId;
  nodoId: LugarId;
  domicilio: DomicilioGuardado;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre">[];
  nodos: readonly NodoDeSubarbol[];
  borrador?: BorradorDeDomicilio | null | undefined;
  /** La ficha desde la que se entro; ver `contenido.ts` (`PropsDeContenido`). */
  regreso?: string | undefined;
};

/**
 * La correccion a lo ancho de la pestana, en lugar de la lista: dentro del
 * panel del domicilio los campos quedaban en 340 px. Una sola superficie,
 * sin tarjeta adentro de otra, y la salida vuelve al panel del que vino.
 */
export function CorreccionDeDomicilio({
  raizId,
  nodoId,
  domicilio,
  calles,
  lugares,
  nodos,
  borrador,
  regreso,
}: Props) {
  const direccion = direccionDeDomicilio(domicilio, calles);
  const panel = `${rutaDe({
    raizId,
    nodoId,
    vista: "domicilios",
    domicilioId: domicilio.id,
    regreso,
  })}#panel-de-domicilio`;

  return (
    <section
      id={ANCLA_DE_CORRECCION}
      aria-labelledby={`${ANCLA_DE_CORRECCION}-titulo`}
      className={`flex scroll-mt-4 flex-col gap-4 ${CLASES_DE_TARJETA} md:p-6`}
    >
      <h2
        id={`${ANCLA_DE_CORRECCION}-titulo`}
        className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
      >
        {`Corregir ${direccion}`}
      </h2>
      <FormularioDeCorreccionDeDomicilio
        raiz={raizId}
        nodo={nodoId}
        domicilio={domicilio}
        calles={opcionesDeCalles(calles)}
        zona={zonaDeCorreccion({ raizId, domicilio, lugares, nodos })}
        borrador={borrador}
        volverA={panel}
        regreso={regreso}
      />
    </section>
  );
}
