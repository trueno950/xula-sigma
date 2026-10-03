import {
  ArrowsLeftRight,
  type CalendarDots,
  MapPin,
  NotePencil,
  Signpost,
  Tray,
  Wrench,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  fechaCivilDeMedianocheUtc,
  fechaYHoraEnMerida,
} from "@/shared/lib/fecha";
import { CLASES_DE_ENLACE, CLASES_DE_TARJETA } from "@/shared/ui";
import type {
  EntradaDeHistorial,
  HistorialDeCalle as Historial,
} from "../domain";

type Props = { historial: Historial };

type Presentacion = {
  etiqueta: string;
  detalle: string;
  Icono: typeof CalendarDots;
  /** El detalle del hecho, si existe una pantalla a la que ir por su id. */
  enlace?: { texto: string; href: (id: string) => string };
};

/**
 * El historial solo trae naturaleza, fecha e id: no guarda el nombre
 * anterior, el punto ni el lugar de origen. Por eso las frases dicen qué
 * pasó y no con qué valores.
 */
const PRESENTACIONES: Record<EntradaDeHistorial["naturaleza"], Presentacion> = {
  REPORTE: {
    etiqueta: "Reporte",
    detalle: "Se registró un reporte en esta calle.",
    Icono: NotePencil,
    enlace: { texto: "Ver reporte", href: (id) => `/reportes/detalle/${id}` },
  },
  INTERVENCION: {
    etiqueta: "Intervención",
    detalle: "Se registró una intervención en esta calle.",
    Icono: Wrench,
    enlace: {
      texto: "Ver intervención",
      href: (id) => `/intervenciones/${id}`,
    },
  },
  RENOMBRE: {
    etiqueta: "Renombre",
    detalle: "Se cambió el nombre de la calle.",
    Icono: Signpost,
  },
  REPARENTEO: {
    etiqueta: "Reparenteo",
    detalle: "Se movió la calle a otro lugar.",
    Icono: ArrowsLeftRight,
  },
  UBICACION: {
    etiqueta: "Ubicación",
    detalle: "Se actualizó el punto de la calle en el mapa.",
    Icono: MapPin,
  },
};

const esDia = (entrada: EntradaDeHistorial) => entrada.precision === "DIA";

function Entrada({ entrada }: { entrada: EntradaDeHistorial }) {
  const { etiqueta, detalle, Icono, enlace } =
    PRESENTACIONES[entrada.naturaleza];
  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <Icono
        size={20}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-caliza-apagada"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
        <p className="text-[15px] text-caliza-tinta">{detalle}</p>
        {enlace ? (
          <Link
            href={enlace.href(entrada.id)}
            className={`self-start rounded-sm text-[15px] ${CLASES_DE_ENLACE}`}
          >
            {enlace.texto}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export function LineaDeTiempoDeCalle({ historial }: Props) {
  if (historial.estado === "VACIO") {
    return (
      <div
        className={`flex flex-col items-center gap-3 px-6 py-12 text-center ${CLASES_DE_TARJETA}`}
      >
        <Tray
          size={40}
          weight="light"
          aria-hidden="true"
          className="text-caliza-apagada"
        />
        <p className="text-[15px] text-caliza-apagada">
          Esta calle todavía no tiene hechos registrados. Aquí aparecerán sus
          reportes, intervenciones y cambios.
        </p>
      </div>
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
