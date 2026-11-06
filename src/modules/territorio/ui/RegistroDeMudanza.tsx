import { Aviso } from "@/shared/ui";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import { FormularioDeMudanza } from "./FormularioDeMudanza";

type Props = {
  personaId: string;
  domicilios: readonly DomicilioParaListado[];
  /** Sin residencias todavia: lo que se registra es el domicilio actual. */
  sinHistorial: boolean;
  /** Se vuelve del alta de domicilio abierta desde esta misma ficha. */
  domicilioRecienCreado: boolean;
};

export function RegistroDeMudanza({
  personaId,
  domicilios,
  sinHistorial,
  domicilioRecienCreado,
}: Props) {
  const titulo = sinHistorial
    ? "Registrar domicilio actual"
    : "Registrar mudanza";

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        {titulo}
      </h2>
      {domicilioRecienCreado ? (
        <Aviso tono="exito">
          Domicilio registrado. Búsquelo abajo para asignarlo a esta persona.
        </Aviso>
      ) : null}
      <FormularioDeMudanza
        personaId={personaId}
        domicilios={domicilios}
        textoDeEnvio={titulo}
      />
    </section>
  );
}
