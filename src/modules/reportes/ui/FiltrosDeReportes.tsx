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
  ESTADOS_DE_REPORTE,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
  TIPOS_DE_INCIDENCIA,
} from "../domain";
import { ChipsDeFiltros } from "./ChipsDeFiltros";

type Props = FiltrosDeLaBandeja & {
  q?: string | undefined;
  soloAtrasados?: boolean | undefined;
  /** Las opciones del `?lugar=`: los lugares activos del municipio. */
  lugares: readonly OpcionDeLista[];
};

/**
 * Un solo `<form method="get">` para busqueda y filtros, no dos separados
 * (`design.md`, "Buscador": "convive con los filtros de la misma pantalla,
 * nunca los reemplaza"). Con dos forms, cambiar el `<select>` de estado
 * mandaria un GET que no lleva `q`, y la busqueda escrita se perderia sin
 * que nada lo avise. Un solo submit manda los tres a la vez, sin
 * JavaScript ni campos ocultos.
 *
 * «Solo atrasados» (S1 de `gestion-municipal`) es una casilla y no un
 * `<select>`: son dos estados, y desmarcarla es lo mismo que no mandar el
 * campo. Viaja en el mismo GET, asi que cambiar de estado o de tipo no la
 * pierde, y su chip de abajo la quita sin tocar los demas filtros.
 *
 * S2 agrega lugar y area responsable al mismo formulario: el lugar es una
 * colonia o una localidad del municipio -el `?lugar=` se resuelve a su
 * subarbol en el servidor-, y el area es el catalogo cerrado de areas que
 * atienden un reporte.
 *
 * Los chips de abajo (`design.md`, "Filtros") son el select confirmado: el
 * `<select>` captura, el chip dice que el filtro esta puesto -sin el, un
 * `<select>` que cambia de valor se lee como la lista completa, no como un
 * resultado acotado-. Viven en `ChipsDeFiltros.tsx`: cinco filtros en un solo
 * componente pasaban la metrica de complejidad de Biome.
 */
export function FiltrosDeReportes({
  q,
  estado,
  tipo,
  area,
  lugar,
  soloAtrasados,
  lugares,
}: Props) {
  const filtros: FiltrosDeLaBandeja = {
    ...(estado ? { estado } : {}),
    ...(tipo ? { tipo } : {}),
    ...(area ? { area } : {}),
    ...(lugar ? { lugar } : {}),
  };

  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
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
              defaultValue={q}
              className={`${clasesDeCampo()} w-64 pl-9`}
            />
          </div>
        </div>
        <CampoDeLista
          id="filtro-estado"
          name="estado"
          etiqueta="Estado"
          marcador="Todos"
          opcional
          defaultValue={estado ?? ""}
          opciones={opcionesEtiquetadas(
            ESTADOS_DE_REPORTE,
            ETIQUETA_DE_ESTADO_DE_REPORTE,
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
            TIPOS_DE_INCIDENCIA,
            ETIQUETA_DE_TIPO_DE_INCIDENCIA,
          )}
        />
        <CampoDeLista
          id="filtro-lugar"
          name="lugar"
          etiqueta="Lugar"
          marcador="Todos"
          opcional
          defaultValue={lugar ?? ""}
          opciones={lugares}
        />
        <CampoDeLista
          id="filtro-area"
          name="area"
          etiqueta="Área"
          marcador="Todas"
          opcional
          defaultValue={area ?? ""}
          opciones={opcionesEtiquetadas(AREAS_RESPONSABLES, ETIQUETA_DE_AREA)}
        />
        <label className="flex h-11 items-center gap-2 text-[13px] font-medium leading-tight text-caliza-apagada">
          <input
            type="checkbox"
            id="filtro-atrasados"
            name="atrasados"
            value="1"
            defaultChecked={soloAtrasados}
            className="size-4"
          />
          Solo atrasados
        </label>
        <Boton type="submit" variante="secundaria">
          Buscar
        </Boton>
      </form>

      <ChipsDeFiltros
        filtros={filtros}
        lugares={lugares}
        q={q}
        soloAtrasados={soloAtrasados}
      />
    </div>
  );
}
