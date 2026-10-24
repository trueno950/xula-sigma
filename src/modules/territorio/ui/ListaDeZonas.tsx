import Link from "next/link";
import type { ColumnaDeTabla } from "@/shared/ui";
import {
  Aviso,
  CeldaDeDato,
  CeldaPrincipal,
  EstadoVacio,
  FilaDeTabla,
  Migaja,
  PaginaDePanel,
  Tabla,
} from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import {
  FormularioDeAltaDeZona,
  FormularioDeBajaDeZonaEnFila,
} from "./FormulariosDeZona";

const COLUMNAS_DE_ZONAS: readonly ColumnaDeTabla[] = [
  { clave: "zona", etiqueta: "Zona" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
  { clave: "baja", etiqueta: "Acciones" },
];

type Props = {
  zonas: readonly ZonaGuardada[];
  asentamientos: readonly LugarGuardado[];
  raizActiva: string | null;
  error: string | undefined;
  aviso: string | undefined;
};

/**
 * El listado de zonas del municipio (o de un asentamiento con `?raiz=`).
 * Cada fila enlaza al detalle `?zona=` y ofrece dar de baja la zona en su
 * propio `<form>` nativo: cero estado de cliente.
 */
export function ListaDeZonas({
  zonas,
  asentamientos,
  raizActiva,
  error,
  aviso,
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

      <FormularioDeAltaDeZona asentamientos={asentamientos} />

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
              <CeldaDeDato>{zona.asentamiento}</CeldaDeDato>
              <CeldaDeDato>
                <FormularioDeBajaDeZonaEnFila zonaId={zona.id} />
              </CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
      <p className="text-[15px] text-caliza-apagada">
        <Link href="/territorio" className="underline">
          Volver al mapa de territorio
        </Link>
      </p>
    </PaginaDePanel>
  );
}
