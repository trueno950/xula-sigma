import {
  Boton,
  CampoDeLista,
  ChipDeFiltro,
  type OpcionDeLista,
  opcionesEtiquetadas,
} from "@/shared/ui";
import type { FiltrosDeIntervenciones as FiltrosAplicados } from "../application/puertosDeLectura";
import {
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
 * La misma pantalla sin el filtro `quitar`, con los otros puestos. Mismo
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
 * Los filtros del tablero (S1): un solo `<form method="get">`, sin
 * JavaScript, con tipo y lugar.
 *
 * **El estado no esta aca**: es la estructura de la pantalla -las cuatro
 * columnas-, y una quinta forma de decir lo mismo solo podria discrepar de las
 * columnas. Se sigue leyendo de la URL porque el pie de una columna lleva a
 * «Ver las N planificadas», y entonces el chip de estado es el que lo quita.
 */
export function FiltrosDeIntervenciones({ filtros, lugares }: Props) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <CampoDeLista
        id="filtro-tipo"
        name="tipo"
        etiqueta="Tipo"
        marcador="Todos"
        opcional
        defaultValue={filtros.tipo ?? ""}
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
        defaultValue={filtros.lugarId ?? ""}
        opciones={lugares}
      />
      <Boton type="submit" variante="secundaria">
        Filtrar
      </Boton>
    </form>
  );
}

/**
 * Los chips de lo que esta puesto, fuera del pliegue: en el telefono el
 * `<details>` arranca cerrado, y el chip es lo unico que dice, sin abrirlo,
 * que la lista esta acotada y por que. Cada chip se quita solo a si mismo.
 */
export function ChipsDeFiltrosDeIntervenciones({ filtros, lugares }: Props) {
  const { estado, tipo, lugarId } = filtros;

  if (!estado && !tipo && !lugarId) return null;

  return (
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
  );
}
