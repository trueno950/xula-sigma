import type { ReactNode } from "react";
import {
  Campo,
  CampoDeLista,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import type { AsentamientoDeCalle } from "./coloniasDelAlta";
import { SelectorDeCalleConBusqueda } from "./SelectorDeCalleConBusqueda";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Valores = {
  calleId: string;
  numero: string;
  entreCalleAId: string;
  entreCalleBId: string;
  referencia: string;
  /** Solo el borrador la trae; sin ella abre con `zona.inicial`. */
  zonaId?: string;
};

type Props = {
  /** Prefijo de los `id`: el alta y la correccion pueden convivir en la pagina. */
  prefijo: string;
  /** El `name` del campo de zona difiere entre el alta y la correccion. */
  nombreDeZona: string;
  calles: readonly OpcionDeLista[];
  zona: NivelDelFormulario;
  origenDeCalles?: string | undefined;
  valores?: Valores;
  /** Con grupos bajo un titulo (alta) o sin titulos (correccion). */
  agrupar: boolean;
  /**
   * Desde `md`, los campos cortos de cada seccion en dos columnas. La de
   * Donde da dos tercios a la calle: su nombre es el dato largo.
   */
  rejilla?: boolean;
  /** Acorta la colonia a la calle elegida; ver `SelectorDeCalleConBusqueda`. */
  asentamientoDeCalle?: AsentamientoDeCalle | undefined;
};

const alfabeticas = (calles: readonly OpcionDeLista[]) =>
  [...calles].sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, "es", { numeric: true }),
  );

function Seccion({
  titulo,
  agrupar,
  columnas,
  children,
}: {
  titulo: string;
  agrupar: boolean;
  /** Las clases de la rejilla; sin ellas, una columna. */
  columnas?: string | undefined;
  children: ReactNode;
}) {
  const campos = columnas ? (
    <div className={`grid gap-4 ${columnas}`}>{children}</div>
  ) : (
    children
  );

  return agrupar ? (
    <GrupoDeCampos titulo={titulo} nivel="subseccion">
      {campos}
    </GrupoDeCampos>
  ) : (
    campos
  );
}

const COLUMNAS_DE_DONDE =
  "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start";
const COLUMNAS_PAREJAS = "md:grid-cols-2 md:items-start";

/**
 * Los campos del domicilio, en el orden en que se piensa una direccion:
 * donde esta, entre que calles queda y como encontrarlo. Los comparten el
 * alta y la correccion; solo cambian los `id` y los valores de arranque.
 *
 * La colonia es un campo con etiqueta y no un bloque plegado: esconderla
 * hacia que la operadora no supiera que existia. La pinta
 * `SelectorDeCalleConBusqueda`, porque lo que ofrece depende de la calle;
 * el numero va entre las dos como hijo del servidor.
 *
 * La calle es el unico campo con buscador; ver `SelectorDeCalleConBusqueda`.
 */
export function CamposDeDomicilio({
  prefijo,
  nombreDeZona,
  calles,
  zona,
  origenDeCalles,
  valores,
  agrupar,
  rejilla = false,
  asentamientoDeCalle,
}: Props) {
  const opciones = alfabeticas(calles);
  const por = (campo: keyof Valores) =>
    valores ? { defaultValue: valores[campo] } : {};

  return (
    <>
      <Seccion
        titulo="Dónde"
        agrupar={agrupar}
        columnas={rejilla ? COLUMNAS_DE_DONDE : undefined}
      >
        <SelectorDeCalleConBusqueda
          id={`${prefijo}-calle-id`}
          name="calleId"
          opciones={opciones}
          marcador="Seleccione una calle"
          ayuda={
            origenDeCalles
              ? `Catálogo de ${origenDeCalles}: la calle donde está el domicilio.`
              : "La calle donde está el domicilio."
          }
          valorInicial={valores?.calleId}
          colonia={{
            id: `${prefijo}-zona-id`,
            name: nombreDeZona,
            nivel: zona,
            valorInicial: valores?.zonaId ?? zona.inicial,
            asentamientoDeCalle,
          }}
        >
          <Campo
            id={`${prefijo}-numero`}
            name="numero"
            etiqueta="Número"
            tipografia="dato"
            ayuda="Dejar vacío si el domicilio no tiene número."
            {...por("numero")}
          />
        </SelectorDeCalleConBusqueda>
      </Seccion>

      <Seccion
        titulo="Entre qué calles"
        agrupar={agrupar}
        columnas={rejilla ? COLUMNAS_PAREJAS : undefined}
      >
        <CampoDeLista
          id={`${prefijo}-entre-a-id`}
          name="entreCalleAId"
          etiqueta="Entre calle"
          marcador="Ninguna"
          opcional
          opciones={opciones}
          ayuda="Opcional: una de las calles que cruzan cerca."
          {...por("entreCalleAId")}
        />
        <CampoDeLista
          id={`${prefijo}-entre-b-id`}
          name="entreCalleBId"
          etiqueta="Y calle"
          marcador="Ninguna"
          opcional
          opciones={opciones}
          ayuda="Opcional: la otra calle."
          {...por("entreCalleBId")}
        />
      </Seccion>

      <Seccion titulo="Referencia" agrupar={agrupar}>
        <Campo
          id={`${prefijo}-referencia`}
          name="referencia"
          etiqueta="Referencia"
          ayuda="Una seña para encontrarlo: junto a la cancha, portón azul."
          {...por("referencia")}
        />
      </Seccion>
    </>
  );
}
