import Link from "next/link";
import type { ColumnaDeTabla } from "@/shared/ui";
import {
  Aviso,
  CeldaDeApoyo,
  CeldaPrincipal,
  EstadoVacio,
  FilaDeTabla,
  Migaja,
  PaginaDePanel,
  Panel,
  Tabla,
} from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import { FormularioDeAltaDeZona } from "./FormulariosDeZona";

const COLUMNAS_DE_ZONAS: readonly ColumnaDeTabla[] = [
  { clave: "zona", etiqueta: "Zona" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
];

type Props = {
  zonas: readonly ZonaGuardada[];
  asentamientos: readonly LugarGuardado[];
  raizActiva: string | null;
  error: string | undefined;
  aviso: string | undefined;
  /** `permisosDeTerritorio(rol).administraZonas`: sin el, no hay alta. */
  puedeAdministrar: boolean;
};

/**
 * El listado de zonas del municipio (o de un asentamiento con `?raiz=`).
 * Cada fila solo enlaza al detalle `?zona=`: la baja vive alli, detras de
 * un `<details>`, y no dentro del enlace de la fila.
 */
export function ListaDeZonas({
  zonas,
  asentamientos,
  raizActiva,
  error,
  aviso,
  puedeAdministrar,
}: Props) {
  return (
    <PaginaDePanel
      titulo="Zonas"
      descripcion="Zonas operativas del municipio, agrupadas por asentamiento."
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

      {puedeAdministrar ? (
        <Panel titulo="Nueva zona">
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
              etiquetaAccesible={`${zona.nombre}, ${zona.asentamiento}`}
            >
              <CeldaPrincipal>{zona.nombre}</CeldaPrincipal>
              <CeldaDeApoyo>{zona.asentamiento}</CeldaDeApoyo>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
      <p className="text-[15px] text-caliza-apagada">
        <Link href="/territorio" className="underline">
          Volver a Territorio
        </Link>
      </p>
    </PaginaDePanel>
  );
}
