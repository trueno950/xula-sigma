"use client";

import {
  CaretDown,
  FunnelSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react/ssr";
import { useEffect, useRef } from "react";
import {
  Boton,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  type OpcionDeLista,
} from "@/shared/ui";
import type { FiltrosDeRegistro } from "../application/puertosDeDomicilios";

/**
 * Desde donde la barra cabe en una sola fila y el pliegue se abre solo. Es el
 * corte de `sm` (640px) y no el `lg` de `PliegueDeFiltrosDeReportes` porque
 * aca el pliegue guarda un solo campo angosto.
 */
const CONSULTA_DE_ESCRITORIO = "(min-width: 640px)";

const PISTA =
  "Escriba la calle y, si la sabe, el número seguido: Calle 20 101. También busca por asentamiento. No distingue acentos ni mayúsculas.";

type Props = {
  filtros: FiltrosDeRegistro;
  /** Las raices del municipio: alimentan solo este `<select>`. */
  raices: readonly OpcionDeLista[];
};

/**
 * El pliegue abre su cuerpo en escritorio al montar, igual que
 * `reportes/ui/PliegueDeFiltrosDeReportes`: el `<details>` sale del servidor
 * cerrado y sin JavaScript el escritorio lo abre con un clic mientras el
 * telefono lo tiene a un toque.
 */
const usePliegueAbiertoEnEscritorio = () => {
  const pliegue = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_DE_ESCRITORIO);
    const aplicar = () => {
      if (pliegue.current) pliegue.current.open = consulta.matches;
    };
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  return pliegue;
};

/**
 * La busqueda de S9: un solo campo que pide «Calle y número» con el ejemplo
 * de pista, y el asentamiento detras de «Filtros (N)» en el telefono. Antes
 * eran tres cajas y el telefono ponia cuatro controles antes del primer
 * domicilio.
 *
 * El `<form>` sigue siendo un GET nativo con su «Buscar»: sin JavaScript la
 * lista se pide igual, y lo unico que se pierde es el pliegue abierto.
 *
 * El asentamiento es **un solo** `<select>`: en el telefono vive dentro del
 * pliegue y en escritorio el pliegue se abre y queda en la misma fila. Un
 * segundo `<select>` para el ancho grande repetiria el `name` dentro del
 * mismo formulario y lo mandaria dos veces.
 */
export function FiltrosDeDomicilios({ filtros, raices }: Props) {
  const pliegue = usePliegueAbiertoEnEscritorio();
  const activos = filtros.raizId ? 1 : 0;

  return (
    <form
      method="get"
      aria-label="Buscar domicilios"
      className="flex flex-wrap items-end gap-3 max-sm:flex-col max-sm:items-stretch"
    >
      <div className="flex items-end gap-2 sm:contents">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[32rem]">
          <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
            Calle y número
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
            />
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Calle 20 101"
              defaultValue={filtros.busqueda}
              className={`${clasesDeCampo()} w-full pl-9`}
            />
          </div>
        </div>
        <div className="shrink-0 sm:order-3">
          <Boton type="submit" variante="secundaria">
            Buscar
          </Boton>
        </div>
      </div>

      <p className="w-full text-[13px] leading-snug text-caliza-apagada sm:order-4">
        {PISTA}
      </p>

      <details
        ref={pliegue}
        className="group rounded-lg border border-caliza-divisor bg-caliza-lienzo sm:order-2 sm:w-56 sm:rounded-none sm:border-0 sm:bg-transparent"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-semibold text-caliza-tinta marker:content-none sm:hidden">
          <FunnelSimple size={16} aria-hidden="true" />
          Filtros
          <span className="font-mono text-[14px] tabular-nums text-caliza-apagada">
            ({activos})
          </span>
          <CaretDown
            size={16}
            aria-hidden="true"
            className="ml-auto transition-transform duration-150 ease-salida group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-3 px-4 pt-2 pb-4 sm:p-0">
          <CampoDeLista
            id="filtro-raiz"
            name="raiz"
            etiqueta="Asentamiento"
            marcador="Todos los asentamientos"
            opcional
            defaultValue={filtros.raizId ?? ""}
            opciones={raices}
          />
        </div>
      </details>
    </form>
  );
}
