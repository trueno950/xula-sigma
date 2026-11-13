import { DownloadSimple } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { contextoActual } from "@/shared/auth";
import { puedeExportar } from "@/shared/auth/roles";
import {
  CLASES_DE_TARJETA,
  clasesDeBoton,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Exportación" };

/**
 * La pantalla de S1: el `ADMIN_MUNICIPAL` se lleva todo su municipio.
 *
 * La guarda de rol se repite aca por la misma razon que en Usuarios —no
 * mostrar una pantalla que la descarga va a rechazar igual— y no es la que
 * autoriza: `GET /exportacion/descarga` vuelve a exigir `puedeExportar`
 * dentro de `exportarAyuntamiento`, porque ocultar un enlace no es
 * autorizacion (`05-seguridad.md` seccion 6).
 *
 * El boton es un `<a download>` nativo y no un `EnlaceDeAccion`: descargar
 * un archivo no es navegar, y el `download` del navegador evita que el ZIP
 * se abra en una pestana. Sin JavaScript funciona igual.
 */
export default async function PaginaDeExportacion() {
  const contexto = await contextoActual();

  if (!contexto || !puedeExportar(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje
        mensaje="Su rol no tiene permiso para exportar los datos del ayuntamiento."
        accion={
          <EnlaceDeAccion href="/padron" variante="secundaria">
            Volver al padrón
          </EnlaceDeAccion>
        }
      />
    );
  }

  return (
    <PaginaDePanel
      titulo="Exportación"
      descripcion="Todo lo que este ayuntamiento tiene en la plataforma, en un archivo que abre cualquier programa."
      ancho="detalle"
      accion={
        <a
          href="/exportacion/descarga"
          download
          className={clasesDeBoton("primaria")}
        >
          <DownloadSimple size={18} weight="bold" aria-hidden="true" />
          Descargar los datos del ayuntamiento
        </a>
      }
    >
      <div
        className={`${CLASES_DE_TARJETA} flex flex-col gap-3 text-[15px] text-caliza-apagada`}
      >
        <p>
          El archivo es un ZIP con un CSV por conjunto —padrón, territorio,
          constancias, reportes e intervenciones—, con encabezado y en UTF-8: se
          abre en Excel con doble clic y los acentos salen bien.
        </p>
        <p>
          Adentro va también un <code>manifiesto.json</code> con el
          ayuntamiento, su marca y el momento en que se generó, y el escudo del
          municipio si está cargado. Los folios van incluidos, para que quien
          reciba los datos pueda seguir la numeración sin repetirla.
        </p>
        <p>
          Cada descarga queda registrada en la bitácora con quién la pidió,
          desde dónde y cuándo.
        </p>
      </div>
    </PaginaDePanel>
  );
}
