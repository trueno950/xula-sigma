import { ChipDeFiltro } from "@/shared/ui";
import type { FiltrosDeListado } from "../application/puertos";
import {
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
  type OrdenDeConstancias,
} from "../domain";
import { descripcionDelOrdenDeConstancias } from "./descripcionDeFiltros";
import { hrefSinBusqueda, hrefSinEstado } from "./hrefsDeListado";

type Props = {
  /** Cuantas constancias trae la pagina que se esta viendo. */
  total: number;
  filtros: FiltrosDeListado;
  /** El `?q=` que produjo esta lista, si lo hubo. */
  q?: string | undefined;
  orden?: OrdenDeConstancias | undefined;
};

/**
 * La linea de resultado de S2: cuantas constancias, con que busqueda, con
 * que orden, y un chip por cada filtro puesto -la busqueda y el estado, cada
 * uno se quita solo a si mismo y conserva el otro-.
 *
 * El numero es el de la pagina, no el del municipio: `listarConstancias` y
 * `buscarConstancias` piden `limite + 1` filas y no hacen un `COUNT(*)`,
 * asi que el total del municipio solo existe cuando no hay otra pagina
 * (`PieDeConstancias`). Mismo criterio que `padron/ui/ResumenDeListado`.
 */
export function ResumenDeConstancias({ total, filtros, q, orden }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[15px] text-caliza-tinta">
        <span className="font-mono font-semibold tabular-nums">{total}</span>
        {` ${total === 1 ? "constancia" : "constancias"}`}
        {q ? ` para «${q}»` : null}
        <span className="text-caliza-apagada">
          {` · ${descripcionDelOrdenDeConstancias(orden)}`}
        </span>
      </p>
      {q || filtros.estado ? (
        <div className="flex flex-wrap gap-2">
          {q ? (
            <ChipDeFiltro
              etiqueta={q}
              hrefQuitar={hrefSinBusqueda({ filtros, orden })}
            />
          ) : null}
          {filtros.estado ? (
            <ChipDeFiltro
              etiqueta={`Estado: ${ETIQUETA_DE_ESTADO_DE_CONSTANCIA[filtros.estado]}`}
              hrefQuitar={hrefSinEstado({ q, orden })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * El pie de S2: cuanto se esta viendo de la lista. «de N» solo cuando la
 * pagina no tiene siguiente; con «Ver mas» el total del municipio no se
 * conoce -no hay `COUNT`- y prometerlo seria inventarlo.
 */
export function PieDeConstancias({
  total,
  hayMas,
}: {
  total: number;
  hayMas?: boolean | undefined;
}) {
  return (
    <p className="text-[13px] leading-tight text-caliza-apagada">
      Mostrando <span className="font-mono tabular-nums">1–{total}</span>
      {hayMas ? null : (
        <>
          {" de "}
          <span className="font-mono tabular-nums">{total}</span>
        </>
      )}{" "}
      {total === 1 ? "constancia" : "constancias"}
    </p>
  );
}
