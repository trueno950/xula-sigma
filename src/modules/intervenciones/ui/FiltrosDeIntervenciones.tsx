import {
  Boton,
  CampoDeLista,
  ChipDeFiltro,
  type OpcionDeLista,
  opcionesEtiquetadas,
} from "@/shared/ui";
import type { FiltrosDeIntervenciones as FiltrosAplicados } from "../application/puertosDeLectura";
import {
  ESTADOS_DE_INTERVENCION,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  TIPOS_DE_INTERVENCION,
} from "../domain";

type Props = {
  filtros: FiltrosAplicados;
  /** Los lugares del municipio, para el `<select>` y para nombrar el chip. */
  lugares: readonly OpcionDeLista[];
};

type CampoDeFiltro = keyof FiltrosAplicados;

/**
 * La misma pantalla sin el filtro `quitar`, con los otros dos puestos. Mismo
 * criterio que `reportes/ui/hrefsDeListado`: quitar un filtro es navegacion,
 * nunca estado de cliente.
 */
const hrefSinFiltro = (
  filtros: FiltrosAplicados,
  quitar: CampoDeFiltro,
): string => {
  const resto = { ...filtros };
  delete resto[quitar];

  const query = new URLSearchParams();
  if (resto.estado) query.set("estado", resto.estado);
  if (resto.tipo) query.set("tipo", resto.tipo);
  if (resto.lugarId) query.set("lugarId", resto.lugarId);

  const cadena = query.toString();
  return cadena ? `/intervenciones?${cadena}` : "/intervenciones";
};

const nombreDeLugar = (
  lugares: readonly OpcionDeLista[],
  lugarId: string,
): string =>
  lugares.find((lugar) => lugar.valor === lugarId)?.etiqueta ?? "el lugar";

/**
 * Un solo `<form method="get">` con los tres filtros de S1, sin JavaScript:
 * el `<select>` captura y el chip confirma que el filtro esta puesto, para que
 * una lista acotada no se lea como la bandeja completa.
 */
export function FiltrosDeIntervenciones({ filtros, lugares }: Props) {
  const { estado, tipo, lugarId } = filtros;

  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <CampoDeLista
          id="filtro-estado"
          name="estado"
          etiqueta="Estado"
          marcador="Todos"
          opcional
          defaultValue={estado ?? ""}
          opciones={opcionesEtiquetadas(
            ESTADOS_DE_INTERVENCION,
            ETIQUETA_DE_ESTADO_DE_INTERVENCION,
          )}
        />
        <CampoDeLista
          id="filtro-tipo"
          name="tipo"
          etiqueta="Tipo"
          marcador="Todos"
          opcional
          defaultValue={tipo ?? ""}
          opciones={opcionesEtiquetadas(
            TIPOS_DE_INTERVENCION,
            ETIQUETA_DE_TIPO_DE_INTERVENCION,
          )}
        />
        <CampoDeLista
          id="filtro-lugar"
          name="lugarId"
          etiqueta="Lugar"
          marcador="Todos"
          opcional
          defaultValue={lugarId ?? ""}
          opciones={lugares}
        />
        <Boton type="submit" variante="secundaria">
          Filtrar
        </Boton>
      </form>

      {estado || tipo || lugarId ? (
        <div className="flex flex-wrap gap-2">
          {estado ? (
            <ChipDeFiltro
              etiqueta={`Estado: ${ETIQUETA_DE_ESTADO_DE_INTERVENCION[estado]}`}
              hrefQuitar={hrefSinFiltro(filtros, "estado")}
            />
          ) : null}
          {tipo ? (
            <ChipDeFiltro
              etiqueta={`Tipo: ${ETIQUETA_DE_TIPO_DE_INTERVENCION[tipo]}`}
              hrefQuitar={hrefSinFiltro(filtros, "tipo")}
            />
          ) : null}
          {lugarId ? (
            <ChipDeFiltro
              etiqueta={`Lugar: ${nombreDeLugar(lugares, lugarId)}`}
              hrefQuitar={hrefSinFiltro(filtros, "lugarId")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
