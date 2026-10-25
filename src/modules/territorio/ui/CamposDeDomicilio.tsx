import type { ReactNode } from "react";
import {
  Campo,
  CampoDeLista,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import { SelectorDeCalleConBusqueda } from "./SelectorDeCalleConBusqueda";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Valores = {
  calleId: string;
  numero: string;
  entreCalleAId: string;
  entreCalleBId: string;
  referencia: string;
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
  /** Con grupos bajo un Headline (alta) o en una sola columna (panel). */
  agrupar: boolean;
};

const alfabeticas = (calles: readonly OpcionDeLista[]) =>
  [...calles].sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, "es", { numeric: true }),
  );

function Seccion({
  titulo,
  agrupar,
  children,
}: {
  titulo: string;
  agrupar: boolean;
  children: ReactNode;
}) {
  return agrupar ? (
    <GrupoDeCampos titulo={titulo}>{children}</GrupoDeCampos>
  ) : (
    children
  );
}

/**
 * Los campos del domicilio, en el orden en que se piensa una direccion:
 * donde esta, entre que calles queda y como encontrarlo. Los comparten el
 * alta y la correccion; solo cambian los `id` y los valores de arranque.
 *
 * La colonia es un campo con etiqueta y no un bloque plegado: esconderla
 * hacia que la operadora no supiera que existia. Cuando el municipio no
 * tiene ninguna zona el campo se deshabilita y explica el vacio
 * (`NivelDelFormulario.sinZonas`): un `<select>` con el marcador solo se lee
 * como un control roto.
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
}: Props) {
  const opciones = alfabeticas(calles);
  const por = (campo: keyof Valores) =>
    valores ? { defaultValue: valores[campo] } : {};

  return (
    <>
      <Seccion titulo="Dónde" agrupar={agrupar}>
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
        />
        <Campo
          id={`${prefijo}-numero`}
          name="numero"
          etiqueta="Número"
          tipografia="dato"
          ayuda="Dejar vacío si el domicilio no tiene número."
          {...por("numero")}
        />
        <CampoDeLista
          id={`${prefijo}-zona-id`}
          name={nombreDeZona}
          etiqueta="Colonia (opcional)"
          marcador={zona.marcador}
          opcional
          opciones={zona.opciones}
          ayuda={zona.resumen}
          defaultValue={zona.inicial}
          disabled={zona.sinZonas}
        />
      </Seccion>

      <Seccion titulo="Entre qué calles" agrupar={agrupar}>
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
