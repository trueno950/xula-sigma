import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  opcionesEtiquetadas,
} from "@/shared/ui";
import type { FiltrosDeListado } from "../application/puertos";
import {
  ESTADOS_DE_CONSTANCIA,
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
} from "../domain";

type Props = FiltrosDeListado & { q?: string | undefined };

/**
 * Un solo `<form method="get">` para busqueda y filtro, no dos separados
 * -mismo motivo que `reportes/ui/FiltrosDeReportes.tsx` (`design.md`,
 * "Buscador"): con dos, cambiar el estado mandaria un GET sin `q` y la
 * busqueda escrita se perderia sin que nada lo avise.
 *
 * La ayuda de S2 dice por que el campo -folio o nombre del titular, sin
 * acentos-, y no un `placeholder`: al escribir, el placeholder desaparece y
 * con el la unica pista de que la busqueda alcanza a las dos cosas.
 *
 * Los chips de lo puesto no viven aca sino en `ResumenDeConstancias`, junto
 * al conteo: es la misma fila la que dice cuantas hay y por que (S2).
 *
 * Sin `<select>` de tipo de documento -motivo en `FiltrosDeListado`,
 * `application/puertosDeListado.ts`.
 */
export function FiltrosDeConstancias({ q, estado }: Props) {
  return (
    <form
      method="get"
      action="/constancias"
      aria-label="Buscar constancias emitidas"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-4 shadow-reposo"
    >
      <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:max-w-sm sm:flex-[2_1_16rem]">
        <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
          Buscar constancia
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
            defaultValue={q}
            aria-describedby="q-ayuda"
            className={`${clasesDeCampo()} pl-9`}
          />
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-col sm:w-auto sm:max-w-56">
        <CampoDeLista
          id="filtro-estado"
          name="estado"
          etiqueta="Estado"
          marcador="Todos"
          opcional
          defaultValue={estado ?? ""}
          opciones={opcionesEtiquetadas(
            ESTADOS_DE_CONSTANCIA,
            ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
          )}
        />
      </div>
      <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </div>
      <p id="q-ayuda" className={`${CLASES_DE_ETIQUETA} basis-full`}>
        Por folio (VEC-2026-000018) o por el nombre del titular. No distingue
        acentos ni mayúsculas.
      </p>
    </form>
  );
}
