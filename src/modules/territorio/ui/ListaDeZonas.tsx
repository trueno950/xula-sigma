import { Plus } from "@phosphor-icons/react/ssr";
import type { ColumnaDeTabla } from "@/shared/ui";
import {
  Aviso,
  CeldaDeApoyo,
  CeldaDeDato,
  CeldaPrincipal,
  EnlaceDeAccion,
  EstadoVacio,
  FilaDeTabla,
  Migaja,
  PaginaDePanel,
  Panel,
  Tabla,
} from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaConCalles } from "../application/puertosDeLecturaDeZonas";
import { ANCLA_DE_ALTA, conAnclaDeAlta } from "./anclaDeAlta";
import { FormularioDeAltaDeZona } from "./FormulariosDeZona";
import { BarraDeAcciones } from "./PanelDeAccion";

const COLUMNAS_DE_ZONAS: readonly ColumnaDeTabla[] = [
  { clave: "zona", etiqueta: "Zona" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
  { clave: "calles", etiqueta: "Calles" },
];

const HREF_DEL_ALTA = conAnclaDeAlta("/territorio/zonas?accion=nueva");

type Props = {
  zonas: readonly ZonaConCalles[];
  asentamientos: readonly LugarGuardado[];
  raizActiva: string | null;
  error: string | undefined;
  aviso: string | undefined;
  /** `permisosDeTerritorio(rol).administraZonas`: sin el, no hay alta. */
  puedeAdministrar: boolean;
  /** `?accion=nueva`: el alta se pidio desde el boton y ocupa su panel. */
  altaAbierta: boolean;
};

/**
 * El listado de zonas del municipio (o de un asentamiento con `?raiz=`).
 * Cada fila solo enlaza al detalle `?zona=`: la baja vive alli, detras de
 * un `<details>`, y no dentro del enlace de la fila.
 *
 * El alta empieza detras de un boton (Z1, S12): abierta siempre empujaba la
 * lista hacia abajo, que es lo que se viene a leer. Es estado de URL
 * (`?accion=nueva`), como el alta de un lugar en la entrada, y sin
 * JavaScript el enlace lleva a la misma pantalla con el formulario abierto.
 *
 * La tabla es una sola y va ordenada por asentamiento -asi la devuelve
 * `listarZonas`-, no agrupada en una tabla por asentamiento: el texto lo
 * dice como es (S13).
 */
export function ListaDeZonas({
  zonas,
  asentamientos,
  raizActiva,
  error,
  aviso,
  puedeAdministrar,
  altaAbierta,
}: Props) {
  const abierta = puedeAdministrar && altaAbierta;

  return (
    <PaginaDePanel
      titulo="Zonas"
      descripcion="Zonas operativas del municipio, ordenadas por asentamiento."
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Territorio", href: "/territorio" },
            { etiqueta: "Zonas" },
          ]}
          etiqueta="Camino a las zonas"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}

      {puedeAdministrar && !abierta ? (
        <BarraDeAcciones>
          <EnlaceDeAccion href={HREF_DEL_ALTA} variante="secundaria">
            <Plus size={18} weight="bold" aria-hidden="true" />
            Nueva zona
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {abierta ? (
        <Panel titulo="Nueva zona" id={ANCLA_DE_ALTA}>
          <FormularioDeAltaDeZona asentamientos={asentamientos} />
        </Panel>
      ) : null}

      {zonas.length === 0 ? (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial={
            raizActiva
              ? `${raizActiva} no tiene zonas activas todavía.`
              : "El municipio no tiene zonas activas todavía."
          }
          hrefSinFiltro="/territorio/zonas"
        />
      ) : (
        <Tabla etiqueta="Zonas del municipio" columnas={COLUMNAS_DE_ZONAS}>
          {zonas.map((zona) => (
            <FilaDeTabla
              key={zona.id}
              href={`/territorio/zonas?zona=${zona.id}`}
              etiquetaAccesible={`${zona.nombre}, ${zona.asentamiento}, ${zona.calles} ${
                zona.calles === 1 ? "calle" : "calles"
              }`}
            >
              <CeldaPrincipal>{zona.nombre}</CeldaPrincipal>
              <CeldaDeApoyo>{zona.asentamiento}</CeldaDeApoyo>
              <CeldaDeDato>{zona.calles}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </PaginaDePanel>
  );
}
