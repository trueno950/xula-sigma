import { Boton, Campo, CampoDeLista } from "@/shared/ui";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  type EstadoDeReporte,
  MOTIVOS_DE_RECHAZO,
  transicionValida,
} from "../domain";
import { asignarAreaAction } from "./actions/asignarAreaAction";
import { cambiarEstadoAction } from "./actions/cambiarEstadoAction";
import { opcionesDeCatalogo } from "./opciones";

type Props = {
  reporteId: string;
  estadoActual: EstadoDeReporte;
};

const ETIQUETAS: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Marcar recibido",
  EN_ATENCION: "Marcar en atencion",
  RESUELTO: "Marcar resuelto",
  RECHAZADO: "Rechazar",
};

/** Un boton por destino, mismo esqueleto de `<form>` para los dos simples. */
function BotonDeTransicion({
  reporteId,
  destino,
}: {
  reporteId: string;
  destino: EstadoDeReporte;
}) {
  return (
    <form action={cambiarEstadoAction}>
      <input type="hidden" name="id" value={reporteId} />
      <input type="hidden" name="estadoNuevo" value={destino} />
      <Boton type="submit" variante="secundaria">
        {ETIQUETAS[destino]}
      </Boton>
    </form>
  );
}

/**
 * Visible solo si `puedeAdministrarReportes` -la pagina decide, este
 * componente no se guarda a si mismo, mismo reparto que
 * `BotonDeReimpresion`/`BotonDeCancelacion` de `constancias`-. Un boton por
 * destino valido de `transicionValida` en vez de un unico `<select>` con
 * motivo condicional: sin JavaScript no hay forma de mostrar el campo de
 * motivo solo cuando se elige `RECHAZADO` (design.md seccion 15, la unica
 * isla `"use client"` es el buscador de similares, no esta pantalla).
 */
export function AccionesDeReporte({ reporteId, estadoActual }: Props) {
  const destinos = ESTADOS_DE_REPORTE.filter((destino) =>
    transicionValida(estadoActual, destino),
  );

  if (destinos.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {destinos
        .filter((destino) => destino !== "RECHAZADO")
        .map((destino) => (
          <BotonDeTransicion
            key={destino}
            reporteId={reporteId}
            destino={destino}
          />
        ))}

      {destinos.includes("RECHAZADO") ? (
        <form
          action={cambiarEstadoAction}
          className="flex flex-col gap-4 border-t border-caliza-divisor pt-4"
        >
          <input type="hidden" name="id" value={reporteId} />
          <input type="hidden" name="estadoNuevo" value="RECHAZADO" />
          <CampoDeLista
            id={`motivo-${reporteId}`}
            name="motivoDeRechazo"
            etiqueta="Motivo de rechazo"
            marcador="Seleccione un motivo"
            opciones={opcionesDeCatalogo(MOTIVOS_DE_RECHAZO)}
          />
          <Campo
            id={`original-${reporteId}`}
            name="folioDelOriginal"
            etiqueta="Folio del reporte original"
            placeholder="REP-2026-000123"
            ayuda="Solo si el motivo es Duplicado."
            tipografia="dato"
            autoComplete="off"
          />
          <Boton type="submit" variante="peligro">
            Rechazar
          </Boton>
        </form>
      ) : null}

      <form
        action={asignarAreaAction}
        className="flex flex-col gap-4 border-t border-caliza-divisor pt-4"
      >
        <input type="hidden" name="id" value={reporteId} />
        <CampoDeLista
          id={`area-${reporteId}`}
          name="areaResponsable"
          etiqueta="Area responsable"
          marcador="Seleccione un area"
          opciones={opcionesDeCatalogo(AREAS_RESPONSABLES)}
        />
        <Boton type="submit" variante="secundaria">
          Asignar area
        </Boton>
      </form>
    </div>
  );
}
