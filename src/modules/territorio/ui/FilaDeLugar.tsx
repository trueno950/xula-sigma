import { CaretDown, CaretRight, Warning } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  ANILLO_DE_FOCO,
  CLASES_DE_ETIQUETA,
  InsigniaDeEstado,
} from "@/shared/ui";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { puedeSerRaiz, type TipoDeLugar, tipoDeLugarEnFrase } from "../domain";
import type { NodoDeArbol } from "./arbolDeLugares";
import { etiquetaDeTipo } from "./etiquetaDeTipo";

/**
 * El escalon de una fila del arbol, en un solo valor.
 *
 * **Es un paso, no una posicion.** Cada fila vive dentro del `<ul>` de su
 * padre, que ya viene desplazado, asi que lo que agrega una fila se suma a lo
 * que agregaron sus ancestros. Con la tabla de posiciones acumuladas —`pl-4`,
 * `pl-9`, `pl-14`, `pl-[4.5rem]`…— el nivel 2 sumaba 1rem + 2.25rem + 3.5rem y
 * el arbol se abria en abanico: es el hallazgo `R3-cumulative-tree-indentation`
 * de la revision nativa del cierre UX/UI. Un paso fijo deja la sangria
 * proporcional a la profundidad —1rem, 2rem, 3rem—, que es lo que la escala
 * sugiere al leerla.
 */
export const PASO_DE_SANGRIA = "pl-4";

export const sangriaDe = (): string => PASO_DE_SANGRIA;

/** La fila de 48px: movil en dos renglones (nombre y tipo, luego cuentas). */
export const CLASE_DE_FILA =
  "flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2 pr-4";

/**
 * La fila de una rama. No puede vivir dentro de su propio `<details>`: con
 * la rama cerrada el navegador esconde todo lo que no sea el `<summary>`, y
 * el nombre desaparece. Va antes y como contenido en linea, y el `<details>`
 * queda `inline`: la lista de hijos, que si envuelve, rompe la linea y ocupa
 * el ancho completo del `<li>`.
 */
export const CLASE_DE_FILA_DE_RAMA =
  "inline-flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2 align-middle";

export const hrefDeLugar = ({ lugar, raizId, nivel }: NodoDeArbol): string =>
  nivel === 0
    ? `/territorio?raiz=${lugar.id}`
    : `/territorio?raiz=${raizId}&nodo=${lugar.id}`;

const plural = (cantidad: number, singular: string, plural: string) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** Lo que cada fila cuenta, en voz baja: el nombre es lo que manda. */
export function Cuentas({ cuenta }: { cuenta: ConteoDeLugar | undefined }) {
  if (!cuenta) return null;

  return (
    <>
      <span className={CLASES_DE_ETIQUETA}>
        {plural(cuenta.domicilios, "domicilio", "domicilios")}
      </span>
      {cuenta.calles ? (
        <span className={CLASES_DE_ETIQUETA}>
          {plural(cuenta.calles, "calle", "calles")}
        </span>
      ) : null}
      {cuenta.calles === 0 ? (
        <InsigniaDeEstado tono="aviso" etiqueta="Sin calles" />
      ) : null}
    </>
  );
}

/** El tipo del lugar como pastilla: Label sobre relleno, no un dato. */
export function PastillaDeTipo({ tipo }: { tipo: TipoDeLugar }) {
  return (
    <span className="inline-flex h-6 items-center rounded-pill bg-caliza-relleno px-2.5 text-[13px] leading-none font-medium text-caliza-tinta">
      {etiquetaDeTipo(tipo)}
    </span>
  );
}

/** El chevron y su palabra: sin JavaScript, el estado lo lleva `<details>`. */
export function AlternadorDeRama() {
  return (
    <span className={`inline-flex items-center gap-1 ${CLASES_DE_ETIQUETA}`}>
      <CaretRight
        size={14}
        weight="bold"
        aria-hidden="true"
        className="[[open]>summary_&]:hidden"
      />
      <CaretDown
        size={14}
        weight="bold"
        aria-hidden="true"
        className="hidden [[open]>summary_&]:block"
      />
      <span className="[[open]>summary_&]:hidden">Mostrar</span>
      <span className="hidden [[open]>summary_&]:inline">Ocultar</span>
    </span>
  );
}

export function ContenidoDeFila({
  nodo,
  cuenta,
}: {
  nodo: NodoDeArbol;
  cuenta: ConteoDeLugar | undefined;
}) {
  const { lugar, nivel } = nodo;

  return (
    <>
      <span className="flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 sm:basis-auto sm:flex-1">
        <Link
          href={hrefDeLugar(nodo)}
          aria-label={`${lugar.nombre}, ${tipoDeLugarEnFrase(lugar.tipo)}`}
          className={`rounded-sm text-[15px] text-caliza-tinta hover:underline hover:underline-offset-2 ${nivel === 0 ? "font-medium" : ""} ${ANILLO_DE_FOCO}`}
        >
          {lugar.nombre}
        </Link>
        <PastillaDeTipo tipo={lugar.tipo} />
        {/*
          Un rango 0 es "raiz por construccion" (`tipoDeLugar.ts`). Lo
          contrario -una colonia arriba de todo- ya no se puede crear:
          `altaDeLugar` y `reparentearLugar` lanzan `RaizInvalidaError`. Lo
          que queda es dato anterior a esa regla, y
          la pantalla lo senala en vez de esconderlo porque hay que moverlo
          a mano. `scripts/auditar-raices.sql` es el mismo barrido del lado
          de la base.
        */}
        {nivel === 0 && !puedeSerRaiz(lugar.tipo) ? (
          <span className="flex items-center gap-1 text-[13px] font-medium text-senial-aviso">
            <Warning size={14} weight="fill" aria-hidden="true" />
            Debería colgar de un asentamiento
          </span>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Cuentas cuenta={cuenta} />
      </span>
    </>
  );
}
