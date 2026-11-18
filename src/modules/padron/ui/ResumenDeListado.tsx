import { ChipDeFiltro } from "@/shared/ui";
import type { OrdenDePersonas } from "../domain";
import { construirHrefDeListado } from "./hrefsDeListado";

type Props = {
  /** Cuantas personas trae la pagina que se esta viendo. */
  total: number;
  filtro?: string | undefined;
  orden?: OrdenDePersonas | undefined;
};

const POR_APELLIDOS = "por apellidos, de la A a la Z";
const POR_APELLIDOS_AL_REVES = "por apellidos, de la Z a la A";

/**
 * Con que orden llego la lista: el que se pidio en la URL, o el default de
 * la lectura que corrio. Sin `?ordenar=`, una busqueda vuelve por relevancia
 * y el listado por apellidos -el default de cada caso de uso vive en
 * `application/puertos.ts`, y este es el unico lugar de la pantalla que lo
 * nombra-.
 */
const descripcionDelOrden = (
  orden: OrdenDePersonas | undefined,
  filtro: string | undefined,
): string => {
  if (orden)
    return orden.direccion === "desc" ? POR_APELLIDOS_AL_REVES : POR_APELLIDOS;

  return filtro ? "por relevancia" : POR_APELLIDOS;
};

/**
 * La linea de resultado de S3: cuantas personas, que se busco, con que
 * orden, y el chip que quita la busqueda sin tocar el orden pedido.
 *
 * El numero es el de la pagina, no el del municipio: `listarPersonas` y
 * `buscarPersonas` piden `limite + 1` filas y no hacen un `COUNT(*)`, asi
 * que un total solo existe cuando no hay otra pagina. Decirlo con el numero
 * a la vista y el pie con «Ver mas» es lo que se puede afirmar sin contar.
 */
export function ResumenDeListado({ total, filtro, orden }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[15px] text-caliza-tinta">
        <span className="font-mono font-semibold tabular-nums">{total}</span>
        {` ${total === 1 ? "persona" : "personas"}`}
        {filtro ? ` para «${filtro}»` : null}
        <span className="text-caliza-apagada">
          {` · ${descripcionDelOrden(orden, filtro)}`}
        </span>
      </p>
      {filtro ? (
        <ChipDeFiltro
          etiqueta={filtro}
          hrefQuitar={construirHrefDeListado({ orden })}
        />
      ) : null}
    </div>
  );
}

/**
 * El pie de S3: cuanto se esta viendo de la lista. «de N» solo cuando la
 * pagina no tiene siguiente; con «Ver mas» el total del municipio no se
 * conoce -no hay `COUNT`- y prometerlo seria inventarlo.
 */
export function PieDeListado({
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
      {total === 1 ? "persona" : "personas"}
    </p>
  );
}
