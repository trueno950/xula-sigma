import { DownloadSimple } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { inventarioDeExportacion } from "@/app/exportacion/inventarioDeExportacion";
import { contextoActual } from "@/shared/auth";
import { puedeExportar } from "@/shared/auth/roles";
import {
  clasesDeBoton,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { AvisoDeDatosDelPersonal } from "./AvisoDeDatosDelPersonal";
import { ID_DEL_ENLACE_DE_DESCARGA, RUTA_DE_LA_DESCARGA } from "./descargar";
import { EstadoDeLaDescarga } from "./EstadoDeLaDescarga";
import { InventarioDeConjuntos } from "./InventarioDeConjuntos";
import { agruparInventario, totalDeArchivos, totalDeFilas } from "./inventario";
import { codigoDeDescarga } from "./mensajesDeDescarga";
import { PieDelInventario } from "./PieDelInventario";
import { ResumenDeLaExportacion } from "./ResumenDeLaExportacion";
import {
  SIN_PERMISO_DE_EXPORTACION,
  SinPermisoDeExportacion,
} from "./SinPermisoDeExportacion";

export const metadata: Metadata = { title: "Exportación" };

const DESCRIPCION =
  "Todo lo que este ayuntamiento tiene en la plataforma, en un archivo que abre cualquier programa de hojas de cálculo.";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * La pantalla de exportacion segun `design/exportacion/01`: el inventario
 * antes de descargar, con los conteos reales, y el fallo de la descarga
 * adentro del panel.
 *
 * **El enlace de descarga es nativo y no lleva `download`.** Sin JavaScript lo
 * sigue el navegador, que se queda en la pantalla porque el borde responde
 * `Content-Disposition: attachment`; con JavaScript lo intercepta
 * `EstadoDeLaDescarga`. El atributo `download` se fue con S13: con el puesto,
 * un fallo que vuelve al panel como redireccion se guardaba como archivo en
 * vez de pintarse.
 *
 * La guarda de rol se repite aca por la misma razon que en Usuarios —no
 * mostrar una pantalla que la descarga va a rechazar igual— y no es la que
 * autoriza: el borde vuelve a exigir `puedeExportar` dentro de
 * `descargaDeDatos`, y el inventario tambien lo exige.
 */
export default async function PaginaDeExportacion({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return (
      <PantallaDeMensaje
        mensaje={SIN_PERMISO_DE_EXPORTACION}
        accion={
          <EnlaceDeAccion href="/padron" variante="secundaria">
            Volver al padrón
          </EnlaceDeAccion>
        }
      />
    );
  }

  if (!puedeExportar(contexto.usuario.rol)) {
    return (
      <PaginaDePanel titulo="Exportación" descripcion={DESCRIPCION}>
        <SinPermisoDeExportacion rol={contexto.usuario.rol} />
      </PaginaDePanel>
    );
  }

  const [inventario, parametros] = await Promise.all([
    inventarioDeExportacion(contexto),
    searchParams,
  ]);
  const grupos = agruparInventario(inventario.conjuntos);

  return (
    <PaginaDePanel
      titulo="Exportación"
      descripcion={DESCRIPCION}
      ancho="lista"
      accion={
        <a
          id={ID_DEL_ENLACE_DE_DESCARGA}
          href={RUTA_DE_LA_DESCARGA}
          className={clasesDeBoton("primaria")}
        >
          <DownloadSimple size={18} weight="bold" aria-hidden="true" />
          Descargar los datos del ayuntamiento
        </a>
      }
    >
      <div className="flex flex-col gap-6">
        <AvisoDeDatosDelPersonal />
        <ResumenDeLaExportacion
          archivo={inventario.archivo}
          archivos={totalDeArchivos(grupos, inventario.tieneEscudo)}
          filas={totalDeFilas(grupos)}
        />
        <EstadoDeLaDescarga
          nombre={inventario.archivo}
          codigoInicial={codigoDeDescarga(parametros.error)}
        />
        <InventarioDeConjuntos grupos={grupos} />
        <PieDelInventario
          conjuntos={inventario.conjuntos.length}
          tieneEscudo={inventario.tieneEscudo}
        />
      </div>
    </PaginaDePanel>
  );
}
