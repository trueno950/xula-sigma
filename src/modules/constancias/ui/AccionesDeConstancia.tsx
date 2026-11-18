import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { AvisoDePermiso, EnlaceDeAccion } from "@/shared/ui";
import { BotonDeCancelacion } from "./BotonDeCancelacion";
import { BotonDeImprimir } from "./BotonDeImprimir";
import { BotonDeReimpresion } from "./BotonDeReimpresion";

type Props = {
  constanciaId: string;
  personaId: string;
  cancelada: boolean;
  puedeReimprimir: boolean;
  puedeCancelar: boolean;
};

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border bg-caliza-lienzo px-3.5 py-2.5 text-left text-[15px] font-semibold " +
  "transition-colors duration-150 ease-salida [&::-webkit-details-marker]:hidden";

/**
 * Una accion con motivo propio, plegada: reimprimir y cancelar piden un
 * motivo antes de ejecutar, asi que son formularios y no botones sueltos.
 * `<details>` abre sin JavaScript y el `name` compartido lo vuelve acordeon
 * -abrir uno cierra el otro-, mismo patron que `AccionesDeReporte`.
 */
function Desplegable({
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
    <details name="acciones-de-constancia" className="group sm:open:basis-full">
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
 * S9 de `constancias-ux`: la barra de acciones del detalle.
 * «Imprimir» es el unico boton de marca, y las dos acciones con motivo van
 * plegadas, «Cancelar» al final y con el contorno de peligro -cancelar un
 * documento emitido no se deshace-.
 *
 * La guarda de rol la decide la pagina, que es la que conoce la sesion;
 * esconder el boton no es la autorizacion real, que vive en
 * `reimprimirConstancia`/`cancelarConstancia`. El aviso si es de este
 * componente: dice cual de las dos acciones falta y no monta ninguna.
 *
 * Una constancia cancelada no se imprime -el lienzo elegido registra el
 * porque: una hoja cancelada en manos de la persona se lee como prueba
 * vigente-. Tampoco se reimprime ni se vuelve a cancelar: se ofrece emitir
 * otra para el mismo titular. La ruta del PDF sigue respondiendo, marcada;
 * lo que cambia es que la pantalla no la ofrece.
 */
export function AccionesDeConstancia({
  constanciaId,
  personaId,
  cancelada,
  puedeReimprimir,
  puedeCancelar,
}: Props) {
  if (cancelada) return <AccionesDeUnaCancelada personaId={personaId} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <BotonDeImprimir id={constanciaId} />
        {puedeReimprimir ? (
          <Desplegable etiqueta="Reimprimir constancia…">
            <BotonDeReimpresion constanciaId={constanciaId} />
          </Desplegable>
        ) : null}
        {puedeCancelar ? (
          <Desplegable etiqueta="Cancelar constancia…" peligro>
            <BotonDeCancelacion constanciaId={constanciaId} />
          </Desplegable>
        ) : null}
      </div>
      {puedeReimprimir ? null : (
        <AvisoDePermiso
          capacidad="reimprimir esta constancia"
          requisito="un rol con permisos de escritura"
        />
      )}
      {puedeCancelar ? null : (
        <AvisoDePermiso
          capacidad="cancelar esta constancia"
          requisito="el rol de administrador municipal"
        />
      )}
    </div>
  );
}

/** Lo unico que se puede hacer con una hoja cancelada: emitir otra. */
function AccionesDeUnaCancelada({ personaId }: { personaId: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[15px] text-caliza-apagada">
        Para entregar un documento vigente hay que emitir otra constancia para
        esta persona.
      </p>
      <EnlaceDeAccion
        href={`/constancias/emitir?personaId=${personaId}`}
        variante="secundaria"
      >
        Emitir una constancia nueva
      </EnlaceDeAccion>
    </div>
  );
}
