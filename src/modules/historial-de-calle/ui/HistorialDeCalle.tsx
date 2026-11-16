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
import { detalleDe } from "./detalleDeEntrada";

type Props = { historial: Historial };

type Enlace = { texto: string; href: string };

type Presentacion = {
  etiqueta: string;
  /** La frase fija de la naturaleza; `detalleDe` la reemplaza cuando hay payload. */
  detalle: (entrada: EntradaDeHistorial) => string;
  Icono: typeof CalendarDots;
  /** A donde ir por el hecho. La entrada decide cuales, con sus propios ids. */
  enlaces?: (entrada: EntradaDeHistorial) => readonly Enlace[];
};

const SIN_DETALLE = "Se registró una intervención en esta calle.";

/**
 * S5 de `intervenciones-trazabilidad`: una intervención se lee por la obra que
 * fue -«Bache · finalizada», con la fecha en su `<time>`-, no por la frase
 * genérica de su naturaleza. El tipo y el estado llegan ya legibles desde el
 * adaptador, y el reporte de origen se enlaza solo si lo tiene.
 */
const detalleDeObra = (entrada: EntradaDeHistorial): string => {
  if (!entrada.obra) return SIN_DETALLE;

  return `${entrada.obra.tipo} · ${entrada.obra.estado.toLocaleLowerCase("es-MX")}`;
};

const enlacesDeObra = (entrada: EntradaDeHistorial): readonly Enlace[] => {
  const enlaces: Enlace[] = [
    { texto: "Ver intervención", href: `/intervenciones/${entrada.id}` },
  ];

  if (entrada.obra?.reporteId) {
    enlaces.push({
      texto: "Ver reporte de origen",
      href: `/reportes/detalle/${entrada.obra.reporteId}`,
    });
  }

  return enlaces;
};

/**
 * El detalle fijo de cada naturaleza, para el evento que no trae payload;
 * `detalleDe` lo reemplaza por el antes y el despues cuando lo hay.
 */
const PRESENTACIONES: Record<EntradaDeHistorial["naturaleza"], Presentacion> = {
  REPORTE: {
    etiqueta: "Reporte",
    detalle: () => "Se registró un reporte en esta calle.",
    Icono: NotePencil,
    enlaces: (entrada) => [
      { texto: "Ver reporte", href: `/reportes/detalle/${entrada.id}` },
    ],
  },
  INTERVENCION: {
    etiqueta: "Intervención",
    detalle: detalleDeObra,
    Icono: Wrench,
    enlaces: enlacesDeObra,
  },
  RENOMBRE: {
    etiqueta: "Renombre",
    detalle: () => "Se cambió el nombre de la calle.",
    Icono: Signpost,
  },
  REPARENTEO: {
    etiqueta: "Reparenteo",
    detalle: () => "Se movió la calle a otro lugar.",
    Icono: ArrowsLeftRight,
  },
  UBICACION: {
    etiqueta: "Ubicación",
    detalle: () => "Se actualizó el punto de la calle en el mapa.",
    Icono: MapPin,
  },
};

const esDia = (entrada: EntradaDeHistorial) => entrada.precision === "DIA";

function Entrada({ entrada }: { entrada: EntradaDeHistorial }) {
  const { etiqueta, detalle, Icono, enlaces } =
    PRESENTACIONES[entrada.naturaleza];
  const enlacesDelHecho = enlaces?.(entrada) ?? [];

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
        <p className="text-[15px] text-caliza-tinta">
          {detalleDe(entrada, detalle(entrada))}
        </p>
        {enlacesDelHecho.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`self-start rounded-sm text-[15px] ${CLASES_DE_ENLACE}`}
          >
            {enlace.texto}
          </Link>
        ))}
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
