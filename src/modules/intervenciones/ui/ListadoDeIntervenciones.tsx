import { fechaCivilCorta } from "@/shared/lib/fecha";
import {
  CeldaDeApoyo,
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  type EstadoDeLista,
  EstadoVacio,
  FilaDeTabla,
  type OpcionDeLista,
  Tabla,
} from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import type { FiltrosDeIntervenciones } from "../application/puertosDeLectura";
import {
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
} from "../domain";
import { FiltrosDeIntervenciones as Filtros } from "./FiltrosDeIntervenciones";
import { InsigniaDeIntervencion } from "./InsigniaDeIntervencion";

type Props = {
  intervenciones: readonly IntervencionGuardada[];
  lugares: readonly OpcionDeLista[];
  estadoDeLista: EstadoDeLista;
  filtros: FiltrosDeIntervenciones;
};

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1.4fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,1fr)" },
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,1.6fr)" },
  { clave: "fecha", etiqueta: "Ocurrencia", ancho: "minmax(0,1fr)" },
];

const NO_DISPONIBLE = "No disponible";

const nombresDeLugar = (lugares: readonly OpcionDeLista[]) =>
  new Map(lugares.map((lugar) => [lugar.valor, lugar.etiqueta]));

/**
 * La bandeja de S1: tipo, estado, lugar y fecha de ocurrencia de cada obra,
 * con la fila entera como enlace a su detalle. La fecha es civil y se formatea
 * por `shared/lib/fecha` (`AGENTS.md`, "Fecha y hora").
 */
export function ListadoDeIntervenciones({
  intervenciones,
  lugares,
  estadoDeLista: estado,
  filtros,
}: Props) {
  const nombres = nombresDeLugar(lugares);

  return (
    <div className="flex flex-col gap-4">
      <Filtros filtros={filtros} lugares={lugares} />

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavía no hay intervenciones registradas."
          hrefSinFiltro="/intervenciones"
        />
      ) : (
        <Tabla etiqueta="Intervenciones" columnas={COLUMNAS}>
          {intervenciones.map((intervencion) => (
            <FilaDeTabla
              key={intervencion.id}
              href={`/intervenciones/${intervencion.id}`}
              etiquetaAccesible={`${ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo]}, ${
                ETIQUETA_DE_ESTADO_DE_INTERVENCION[intervencion.estado]
              }`}
            >
              <CeldaPrincipal>
                {ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo]}
              </CeldaPrincipal>
              <InsigniaDeIntervencion estado={intervencion.estado} />
              <CeldaDeApoyo>
                {nombres.get(intervencion.lugarId) ?? NO_DISPONIBLE}
              </CeldaDeApoyo>
              <CeldaDeDato>
                {fechaCivilCorta(intervencion.fechaDeOcurrencia)}
              </CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </div>
  );
}
