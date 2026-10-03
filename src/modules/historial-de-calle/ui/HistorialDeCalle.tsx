import {
  type CalendarDots,
  MapPin,
  NotePencil,
  Signpost,
  Wrench,
} from "@phosphor-icons/react/ssr";
import {
  fechaCivilDeMedianocheUtc,
  fechaYHoraEnMerida,
} from "@/shared/lib/fecha";
import { CLASES_DE_TARJETA } from "@/shared/ui";
import type {
  EntradaDeHistorial,
  HistorialDeCalle as Historial,
} from "../domain";

type Props = { historial: Historial };

type Presentacion = { etiqueta: string; Icono: typeof CalendarDots };

const PRESENTACIONES: Record<EntradaDeHistorial["naturaleza"], Presentacion> = {
  REPORTE: { etiqueta: "Reporte", Icono: NotePencil },
  INTERVENCION: { etiqueta: "Intervención", Icono: Wrench },
  RENOMBRE: { etiqueta: "Renombre", Icono: Signpost },
  REPARENTEO: { etiqueta: "Reparenteo", Icono: Signpost },
  UBICACION: { etiqueta: "Ubicación", Icono: MapPin },
};

const esDia = (entrada: EntradaDeHistorial) => entrada.precision === "DIA";

function Entrada({ entrada }: { entrada: EntradaDeHistorial }) {
  const { etiqueta, Icono } = PRESENTACIONES[entrada.naturaleza];
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <Icono
        size={20}
        aria-hidden="true"
        className="shrink-0 text-caliza-apagada"
      />
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold text-caliza-tinta">
          {etiqueta}
        </span>
        <time
          className="font-mono text-[14px] tabular-nums text-caliza-apagada"
          dateTime={
            esDia(entrada)
              ? entrada.ocurridoEn.toISOString().slice(0, 10)
              : entrada.ocurridoEn.toISOString()
          }
        >
          {esDia(entrada)
            ? fechaCivilDeMedianocheUtc(entrada.ocurridoEn)
            : fechaYHoraEnMerida(entrada.ocurridoEn)}
        </time>
      </div>
    </li>
  );
}

export function LineaDeTiempoDeCalle({ historial }: Props) {
  if (historial.estado === "VACIO") {
    return (
      <p className={`${CLASES_DE_TARJETA} text-[15px] text-caliza-apagada`}>
        Esta calle todavía no tiene hechos registrados.
      </p>
    );
  }

  return (
    <ol
      className="divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo"
      aria-label="Línea de tiempo de la calle"
    >
      {historial.entradas.map((entrada) => (
        <Entrada
          key={`${entrada.naturaleza}-${entrada.id}`}
          entrada={entrada}
        />
      ))}
    </ol>
  );
}
