import Link from "next/link";
import type { ColumnaDeTabla } from "@/shared/ui";
import {
  CeldaDeDato,
  CeldaPrincipal,
  EstadoVacio,
  FilaDeTabla,
  Migaja,
  PaginaDePanel,
  Tabla,
} from "@/shared/ui";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";

const COLUMNAS_DE_ZONAS: readonly ColumnaDeTabla[] = [
  { clave: "zona", etiqueta: "Zona" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
];

/**
 * El listado de zonas del municipio (o de un asentamiento con `?raiz=`).
 * Cada fila es un enlace GET al detalle `?zona=`: cero estado de cliente.
 */
export function ListaDeZonas({
  zonas,
  raizActiva,
}: {
  zonas: readonly ZonaGuardada[];
  raizActiva: string | null;
}) {
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
