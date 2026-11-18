import { Check } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  type ConteosDeReportes,
  ESTADOS_DE_REPORTE,
  type EstadoDeReporte,
} from "../domain";
import type { CampoDeUrl } from "./hrefsDeListado";

/** Una URL por pestaña, ya resuelta con los filtros que estan puestos. */
export type HrefsDeEstado = Readonly<Record<EstadoDeReporte | "todos", string>>;

type Props = {
  estado?: EstadoDeReporte | undefined;
  /** Conteos **sin** el filtro de estado: lo que cada pestaña abriria. */
  conteos: ConteosDeReportes;
  /** Los reportes atrasados con los otros filtros puestos. */
  totalDeAtrasados: number;
  soloAtrasados?: boolean | undefined;
  hrefs: HrefsDeEstado;
  /** Lo que el interruptor conserva al enviarse: los filtros, sin `atrasados`. */
  camposOcultos: readonly CampoDeUrl[];
};

const PESTANA =
  "inline-flex min-h-11 flex-none items-center gap-1.5 rounded-md px-3.5 " +
  "text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 ease-salida";

const CUENTA = "font-mono text-[14px] tabular-nums";

/**
 * El nombre de cada pestaña, en plural: una pestaña cuenta reportes, y
 * «Recibidos 3» se lee como el resultado que abre. `Record<Union, string>`
 * para que sumar un estado sin su etiqueta no compile.
 */
const ETIQUETA_DE_PESTANA: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Recibidos",
  EN_ATENCION: "En atención",
  RESUELTO: "Resueltos",
  RECHAZADO: "Rechazados",
};

/**
 * La banda de S2/S3: cinco pestañas por estado, cada una con su cuenta, y el
 * interruptor «Solo atrasados» con la suya. Sustituye a la tarjeta de
 * conteos -que era un resumen que no se podia tocar-, asi que cada numero
 * lleva a lo que cuenta.
 *
 * **Son enlaces, no `role=\"tab\"`**: cada pestaña tiene su URL, el boton
 * «atras» del navegador devuelve la anterior, la pantalla se puede compartir
 * donde estaba y sin JavaScript funciona igual. La activa lleva marca suave,
 * `aria-current` **y** palomita, que es la regla de `DESIGN.md`: ningun
 * estado se distingue solo por color.
 *
 * El interruptor es un `<button type=\"submit\">` dentro de un GET con los
 * filtros puestos como campos ocultos, y manda `?atrasados=1` solo mientras
 * esta apagado: al enviarse se invierte sin JavaScript y sin una casilla que
 * no sepa navegar sola. `aria-pressed` dice cual es su estado.
 */
export function PestanasDeEstado({
  estado,
  conteos,
  totalDeAtrasados,
  soloAtrasados = false,
  hrefs,
  camposOcultos,
}: Props) {
  const pestanas = [
    ...ESTADOS_DE_REPORTE.map((clave) => ({
      clave,
      etiqueta: ETIQUETA_DE_PESTANA[clave],
      cuenta: conteos.porEstado[clave],
      href: hrefs[clave],
      activa: estado === clave,
    })),
    {
      clave: "todos" as const,
      etiqueta: "Todos",
      cuenta: conteos.total,
      href: hrefs.todos,
      activa: estado === undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <nav
        aria-label="Estado del reporte"
        className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-caliza-divisor bg-caliza-lienzo p-1 shadow-reposo"
      >
        {pestanas.map((pestana) => (
          <Link
            key={pestana.clave}
            href={pestana.href}
            aria-current={pestana.activa ? "page" : undefined}
            className={`${PESTANA} ${
              pestana.activa
                ? "bg-marca-suave text-caliza-tinta"
                : "text-caliza-apagada hover:bg-caliza-superficie hover:text-caliza-tinta"
            }`}
          >
            {pestana.etiqueta}
            <span className={CUENTA}>{pestana.cuenta}</span>
            {pestana.activa ? (
              <Check size={14} weight="bold" aria-hidden="true" />
            ) : null}
          </Link>
        ))}
      </nav>

      <form method="get" action="/reportes" className="flex">
        {camposOcultos.map((campo) => (
          <input
            key={campo.nombre}
            type="hidden"
            name={campo.nombre}
            value={campo.valor}
          />
        ))}
        {soloAtrasados ? null : (
          <input type="hidden" name="atrasados" value="1" />
        )}
        <button
          type="submit"
          aria-pressed={soloAtrasados}
          className="group inline-flex min-h-11 items-center gap-2.5 rounded-pill border border-caliza-borde bg-caliza-lienzo px-3.5 text-[15px] whitespace-nowrap text-caliza-tinta transition-colors duration-150 ease-salida hover:bg-caliza-superficie focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          <span
            aria-hidden="true"
            className="relative h-[22px] w-[38px] flex-none rounded-pill border border-caliza-borde bg-caliza-lienzo transition-colors duration-150 ease-salida group-aria-pressed:border-caliza-tinta group-aria-pressed:bg-caliza-tinta"
          >
            <span className="absolute top-0.5 left-0.5 size-4 rounded-pill bg-caliza-apagada transition-[left,background-color] duration-150 ease-salida group-aria-pressed:left-[18px] group-aria-pressed:bg-caliza-lienzo" />
          </span>
          Solo atrasados
          <span className={CUENTA}>{totalDeAtrasados}</span>
        </button>
      </form>
    </div>
  );
}
