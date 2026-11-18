import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  type OpcionDeLista,
  opcionesEtiquetadas,
} from "@/shared/ui";
import type { FiltrosDeLaBandeja } from "../application/puertos";
import {
  AREAS_RESPONSABLES,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  type FilaDeConteoDeArea,
  TIPOS_DE_INCIDENCIA,
} from "../domain";

type Props = FiltrosDeLaBandeja & {
  q?: string | undefined;
  /** Las opciones del `?lugar=`: los lugares activos del municipio. */
  lugares: readonly OpcionDeLista[];
  /** Los conteos por area con los otros filtros puestos: cada opcion lleva el suyo. */
  porArea: readonly FilaDeConteoDeArea[];
};

/**
 * Las opciones de «Área» con su conteo entre parentesis (S2, L9). Se
 * recorren las seis del catalogo -no solo las que tienen algo-: un cero es
 * informacion, y es justo lo que decia la tarjeta de conteos que esta barra
 * reemplaza. El conteo viene de Postgres con los otros filtros puestos, nunca
 * de sumar la pagina visible.
 *
 * «Sin asignar» no es una opcion porque no es un area del catalogo: el filtro
 * de area recibe un `AreaResponsable`, y un reporte sin area no se puede
 * pedir por este `<select>`.
 */
const opcionesDeArea = (
  porArea: readonly FilaDeConteoDeArea[],
): readonly OpcionDeLista[] =>
  AREAS_RESPONSABLES.map((area) => {
    const conteo = porArea.find((fila) => fila.area === area)?.conteo ?? 0;
    return { valor: area, etiqueta: `${ETIQUETA_DE_AREA[area]} (${conteo})` };
  });

/**
 * La barra de filtros de S3: busqueda, tipo, lugar y area en **una fila** en
 * escritorio, y un unico `<form method=\"get\">` para todos
 * (`design.md`, "Buscador": la busqueda convive con los filtros, nunca los
 * reemplaza). Con dos formularios, cambiar un `<select>` mandaria un GET sin
 * `q` y la busqueda escrita se perderia sin que nada lo avise.
 *
 * El estado y «solo atrasados» ya **no** viven aca: el estado es la pestaña y
 * el atraso es el interruptor de la banda (`PestanasDeEstado`), asi que la
 * barra se queda con lo que filtra por si mismo.
 *
 * Cambiar un `<select>` no envia nada: sin JavaScript se sigue enviando con
 * «Filtrar», y la fila unica es lo que evita que el boton quede solo en una
 * segunda linea (S3).
 */
export function FiltrosDeReportes({
  q,
  tipo,
  area,
  lugar,
  lugares,
  porArea,
}: Props) {
  const opciones = opcionesDeArea(porArea);

  return (
    <form
      method="get"
      action="/reportes"
      aria-label="Buscar y filtrar reportes"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-0 flex-col gap-1 sm:flex-[2_1_12rem] sm:max-w-xs">
        <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
          Buscar reporte
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
            placeholder="Folio o descripción"
            defaultValue={q}
            className={`${clasesDeCampo()} pl-9`}
          />
        </div>
      </div>
      <div className="min-w-0 sm:flex-1 sm:basis-32 sm:max-w-44">
        <CampoDeLista
          id="filtro-tipo"
          name="tipo"
          etiqueta="Tipo"
          marcador="Todos"
          opcional
          defaultValue={tipo ?? ""}
          opciones={opcionesEtiquetadas(
            TIPOS_DE_INCIDENCIA,
            ETIQUETA_DE_TIPO_DE_INCIDENCIA,
          )}
        />
      </div>
      <div className="min-w-0 sm:flex-1 sm:basis-32 sm:max-w-48">
        <CampoDeLista
          id="filtro-lugar"
          name="lugar"
          etiqueta="Lugar"
          marcador="Todos"
          opcional
          defaultValue={lugar ?? ""}
          opciones={lugares}
        />
      </div>
      <div className="min-w-0 sm:flex-1 sm:basis-32 sm:max-w-56">
        <CampoDeLista
          id="filtro-area"
          name="area"
          etiqueta="Área"
          marcador="Todas"
          opcional
          defaultValue={area ?? ""}
          opciones={opciones}
        />
      </div>
      <Boton type="submit" variante="secundaria">
        Filtrar
      </Boton>
    </form>
  );
}
