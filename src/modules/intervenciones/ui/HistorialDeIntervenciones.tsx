import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import { CLASES_DE_DATO, CLASES_DE_ETIQUETA } from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import type { RevisionVisible } from "../application/historialDeIntervencion";

type Props = {
  revisiones: readonly RevisionVisible[];
};

/** «Ana Canché · Administrador»: el nombre sin el rol se lee a medias (S11). */
const autorDe = (revision: RevisionVisible): string | null =>
  revision.autor
    ? `${revision.autor.nombre} · ${etiquetaDeRol(revision.autor.rol)}`
    : null;

/**
 * La linea de tiempo del historial (S11), de lo mas reciente a lo mas viejo
 * como el artboard. Cada renglon dice que campo se corrigio -o que la
 * correccion no cambio ningun valor-, cita el valor anterior cuando la
 * revision lo sostiene, y lleva quien y cuando en la misma linea.
 *
 * Vive fuera de la ficha y de los formularios a proposito: en el telefono la
 * linea de tiempo va al cierre, nunca detras de un pliegue.
 */
export function HistorialDeIntervenciones({ revisiones }: Props) {
  if (revisiones.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        Sin cambios registrados.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {revisiones.map((revision, indice) => (
        <li key={revision.id} className="relative flex gap-3 pb-5 last:pb-0">
          {indice === revisiones.length - 1 ? null : (
            <span
              aria-hidden="true"
              className="absolute top-4 left-[5px] h-[calc(100%-1rem)] w-0.5 bg-caliza-divisor"
            />
          )}
          <span
            aria-hidden="true"
            className="mt-1.5 size-3 shrink-0 rounded-pill bg-caliza-tinta"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-caliza-tinta">
              {revision.titulo}
            </p>
            {revision.cambios.map((cambio) => (
              <p key={cambio} className={CLASES_DE_ETIQUETA}>
                {cambio}
              </p>
            ))}
            <p className={CLASES_DE_ETIQUETA}>
              {autorDe(revision) === null ? "" : `${autorDe(revision)} · `}
              <time
                dateTime={revision.ocurridoEn.toISOString()}
                className={CLASES_DE_DATO}
              >
                {fechaYHoraEnMerida(revision.ocurridoEn)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
