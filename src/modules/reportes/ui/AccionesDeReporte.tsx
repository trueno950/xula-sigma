import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import {
  Boton,
  Campo,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  opcionesEtiquetadas,
  type VarianteDeBoton,
} from "@/shared/ui";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  type EstadoDeReporte,
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_MOTIVO_DE_RECHAZO,
  MOTIVOS_DE_RECHAZO,
  transicionValida,
} from "../domain";
import { asignarAreaAction } from "./actions/asignarAreaAction";
import { cambiarEstadoAction } from "./actions/cambiarEstadoAction";

type Props = {
  reporteId: string;
  estadoActual: EstadoDeReporte;
  /** «Programar obra»: lo compone la pagina, que es la que conoce `intervenciones`. */
  programarObra?: ReactNode;
};

const ETIQUETAS: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Marcar recibido",
  EN_ATENCION: "Marcar en atención",
  RESUELTO: "Marcar resuelto",
  RECHAZADO: "Rechazar",
};

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border bg-caliza-lienzo px-3.5 py-2.5 text-left text-[15px] font-semibold " +
  "transition-colors duration-150 ease-salida [&::-webkit-details-marker]:hidden";

/**
 * Una accion de apoyo, plegada (S13). `<details>` nativo: abre sin JavaScript,
 * y el `name` compartido lo vuelve acordeon -abrir uno cierra el otro-.
 */
function Desplegable({
  etiqueta,
  peligro = false,
  children,
}: {
  etiqueta: string;
  peligro?: boolean;
  children: ReactNode;
}) {
  const color = peligro
    ? "border-senial-error text-senial-error hover:bg-senial-error-suave"
    : "border-caliza-borde text-caliza-tinta hover:bg-caliza-superficie";

  return (
    <details name="acciones-del-reporte" className="group">
      <summary className={`${CLASES_DE_SUMMARY} ${color}`}>
        {etiqueta}
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden="true"
          className="ml-auto shrink-0 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 flex flex-col gap-4 rounded-md bg-caliza-superficie p-3.5">
        {children}
      </div>
    </details>
  );
}

/** Un `<form>` de transicion de una sola tecla, a todo el ancho del panel. */
function BotonDeTransicion({
  reporteId,
  destino,
  variante,
}: {
  reporteId: string;
  destino: EstadoDeReporte;
  variante: VarianteDeBoton;
}) {
  return (
    <form action={cambiarEstadoAction} className="[&>button]:w-full">
      <input type="hidden" name="id" value={reporteId} />
      <input type="hidden" name="estadoNuevo" value={destino} />
      <Boton type="submit" variante={variante}>
        {ETIQUETAS[destino]}
      </Boton>
    </form>
  );
}

/**
 * El contenido del panel de acciones (S13 de `reportes-ux`). Visible solo si
 * `puedeAdministrarReportes` -la pagina decide, este componente no se guarda
 * a si mismo, mismo reparto que `BotonDeReimpresion`/`BotonDeCancelacion` de
 * `constancias`-.
 *
 * El primer destino valido de `transicionValida` es la accion primaria -la
 * unica con la marca-, el otro destino simple queda de secundaria, y
 * «Programar obra», «Asignar área» y «Rechazar» van plegados: el rechazo al
 * final y tras un divisor, porque es destructivo y nunca puede quedar al lado
 * del paso siguiente. Sin JavaScript no hay campo condicional, asi que el
 * folio del original queda visible y el servidor rechaza la combinacion
 * (design.md seccion 15).
 */
export function AccionesDeReporte({
  reporteId,
  estadoActual,
  programarObra,
}: Props) {
  const destinos = ESTADOS_DE_REPORTE.filter((destino) =>
    transicionValida(estadoActual, destino),
  );
  const [principal, ...resto] = destinos.filter(
    (destino) => destino !== "RECHAZADO",
  );

  if (!principal) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className={CLASES_DE_ETIQUETA}>Siguiente paso</p>
        <BotonDeTransicion
          reporteId={reporteId}
          destino={principal}
          variante="primaria"
        />
      </div>

      {resto.map((destino) => (
        <BotonDeTransicion
          key={destino}
          reporteId={reporteId}
          destino={destino}
          variante="secundaria"
        />
      ))}

      {programarObra ? (
        <Desplegable etiqueta="Programar obra…">{programarObra}</Desplegable>
      ) : null}

      <Desplegable etiqueta="Asignar área…">
        <form action={asignarAreaAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={reporteId} />
          <CampoDeLista
            id={`area-${reporteId}`}
            name="areaResponsable"
            etiqueta="Área responsable"
            marcador="Seleccione un área"
            opciones={opcionesEtiquetadas(AREAS_RESPONSABLES, ETIQUETA_DE_AREA)}
          />
          <Boton type="submit" variante="secundaria">
            Asignar área
          </Boton>
        </form>
      </Desplegable>

      {destinos.includes("RECHAZADO") ? (
        <div className="mt-1 border-t border-caliza-divisor pt-4">
          <Desplegable etiqueta="Rechazar reporte…" peligro>
            <form action={cambiarEstadoAction} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={reporteId} />
              <input type="hidden" name="estadoNuevo" value="RECHAZADO" />
              <CampoDeLista
                id={`motivo-${reporteId}`}
                name="motivoDeRechazo"
                etiqueta="Motivo de rechazo"
                marcador="Seleccione un motivo"
                opciones={opcionesEtiquetadas(
                  MOTIVOS_DE_RECHAZO,
                  ETIQUETA_DE_MOTIVO_DE_RECHAZO,
                )}
              />
              <Campo
                id={`original-${reporteId}`}
                name="folioDelOriginal"
                etiqueta="Folio del reporte original"
                placeholder="REP-AAAA-000123"
                ayuda="Solo si el motivo es Duplicado."
                tipografia="dato"
                autoComplete="off"
              />
              <Boton type="submit" variante="peligro">
                Rechazar reporte
              </Boton>
            </form>
          </Desplegable>
        </div>
      ) : null}
    </div>
  );
}
