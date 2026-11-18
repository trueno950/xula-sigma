import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeFusionarPersonas } from "@/shared/auth/roles";
import { CLASES_DE_TARJETA } from "@/shared/ui";
import { CorregirDatos, type PersonaCorregible } from "./CorregirDatos";
import { DarDeBaja } from "./DarDeBaja";
import { type CandidatoAFusionar, FusionarPersonas } from "./FusionarPersonas";

type Props = {
  persona: PersonaCorregible;
  contexto: ContextoActual;
  /** Las personas parecidas que la página ya buscó para la fusión. */
  candidatos: readonly CandidatoAFusionar[];
};

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border bg-caliza-lienzo px-3.5 py-2.5 text-left text-[15px] font-semibold " +
  "transition-colors duration-150 ease-salida [&::-webkit-details-marker]:hidden";

/**
 * S10: los pliegues de una misma acción de administrar comparten `name`, así
 * que abrir uno cierra el otro sin una línea de JavaScript — el mismo
 * `<details>` en acordeón que `AccionesDeReporte`.
 */
function Pliegue({
  etiqueta,
  peligro = false,
  children,
}: {
  etiqueta: string;
  peligro?: boolean;
  children: ReactNode;
}) {
  const color = peligro
    ? "border-senial-error text-senial-error hover:bg-senial-error-suave"
    : "border-caliza-borde text-caliza-tinta hover:bg-caliza-superficie";

  return (
    <details name="acciones-de-la-ficha" className="group">
      <summary className={`${CLASES_DE_SUMMARY} ${color}`}>
        {etiqueta}
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden="true"
          className="ml-auto shrink-0 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 flex flex-col gap-4 rounded-md bg-caliza-superficie p-3.5">
        {children}
      </div>
    </details>
  );
}

/**
 * La pestaña «Administrar» de la ficha (S9-S12). La página decide si se
 * pinta -solo con permiso de escritura-; acá adentro, la fusión pide además
 * `puedeFusionarPersonas`, que es un permiso distinto: un operador de
 * mostrador corrige y da de baja, pero no fusiona.
 *
 * «Dar de baja…» va al final y detrás de un divisor porque es destructiva:
 * nunca puede quedar al lado del paso siguiente, mismo criterio que el
 * rechazo de un reporte.
 */
export function AdministrarPersona({ persona, contexto, candidatos }: Props) {
  return (
    <section className={`flex flex-col gap-3 ${CLASES_DE_TARJETA}`}>
      <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        Administrar la ficha
      </h2>
      <p className="text-[15px] text-caliza-apagada">
        Cada formulario se envía sin JavaScript; abrir uno cierra el otro.
      </p>

      <Pliegue etiqueta="Corregir datos…">
        <CorregirDatos persona={persona} />
      </Pliegue>

      {puedeFusionarPersonas(contexto.usuario.rol) ? (
        <Pliegue etiqueta="Fusionar con otra persona…">
          <FusionarPersonas
            contexto={contexto}
            ganadoraId={persona.id}
            candidatos={candidatos}
          />
        </Pliegue>
      ) : null}

      <div className="mt-1 border-t border-caliza-divisor pt-4">
        <Pliegue etiqueta="Dar de baja…" peligro>
          <DarDeBaja persona={persona} />
        </Pliegue>
      </div>
    </section>
  );
}
