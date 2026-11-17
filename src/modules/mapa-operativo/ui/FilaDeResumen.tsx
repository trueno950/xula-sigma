import { ChipDeFiltro } from "@/shared/ui";
import type { ChipAplicado, ResumenDelMapa } from "./resumenDelMapa";

type Props = {
  chips: readonly ChipAplicado[];
  resumen: ResumenDelMapa;
};

const NUMERO = "font-mono text-[1.05rem] tabular-nums";
const FILA =
  "flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[15px] text-caliza-apagada";

/**
 * S1: la fila que sigue a los filtros. Primero los filtros puestos, como
 * chips que se quitan -cada uno con la misma pantalla sin el y con los otros
 * conservados-, y despues los cuatro numeros del resumen.
 *
 * Los numeros van en mono y en tinta para que se lean como un dato y no como
 * prosa: es lo que la pantalla dice de un vistazo. El de atrasados toma la
 * senal de error solo cuando hay alguno: un cero en rojo es una alarma
 * permanente por algo que no pasa, y deja de significar.
 */
export function FilaDeResumen({ chips, resumen }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {chips.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <ChipDeFiltro
              key={chip.clave}
              etiqueta={chip.etiqueta}
              hrefQuitar={chip.hrefQuitar}
            />
          ))}
        </div>
      )}
      <section aria-label="Resumen del mapa" className={FILA}>
        <span>
          <strong className={`${NUMERO} text-caliza-tinta`}>
            {resumen.hechos.valor}
          </strong>{" "}
          {resumen.hechos.etiqueta}
        </span>
        <span>
          <strong className={`${NUMERO} text-caliza-tinta`}>
            {resumen.calles.valor}
          </strong>{" "}
          {resumen.calles.etiqueta}
        </span>
        <span>
          <strong
            className={`${NUMERO} ${
              resumen.atrasados.valor > 0
                ? "text-senial-error"
                : "text-caliza-tinta"
            }`}
          >
            {resumen.atrasados.valor}
          </strong>{" "}
          {resumen.atrasados.etiqueta}
        </span>
        <span>
          <strong className={`${NUMERO} text-caliza-tinta`}>
            {resumen.sinUbicar.valor}
          </strong>{" "}
          {resumen.sinUbicar.etiqueta}
        </span>
      </section>
    </div>
  );
}
