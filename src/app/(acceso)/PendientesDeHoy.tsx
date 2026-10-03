import Link from "next/link";
import { ANILLO_DE_FOCO, CLASES_DE_DATO } from "@/shared/ui/estilos";

type Props = {
  /** Reportes en `RECIBIDO`. */
  reportes: number;
  /** El listado trae una sola pagina: el conteo es un piso, no el total. */
  hayMasReportes: boolean;
};

/**
 * Lo que pide atencion hoy (`DESIGN.md`, Inicio). Una lista de cosas por
 * hacer, no un tablero: sin pendientes no pinta nada.
 */
export function PendientesDeHoy({ reportes, hayMasReportes }: Props) {
  if (reportes === 0) return null;

  return (
    <section aria-labelledby="pendientes" className="flex flex-col gap-3">
      <h2
        id="pendientes"
        className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
      >
        Pendientes de hoy
      </h2>
      <ul className="overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo">
        <li>
          <Link
            href="/reportes?estado=RECIBIDO"
            className={`flex min-h-12 items-center justify-between gap-4 px-5 text-[15px] font-semibold text-caliza-tinta transition-colors duration-150 ease-salida hover:bg-caliza-superficie ${ANILLO_DE_FOCO}`}
          >
            Reportes recibidos sin atender
            <span className={CLASES_DE_DATO}>
              {hayMasReportes ? `${reportes}+` : reportes}
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
