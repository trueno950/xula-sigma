import { CLASES_DE_ETIQUETA } from "@/shared/ui";

/**
 * El aviso de datos personales de las tres cajas de texto libre del módulo:
 * el alta, la corrección y programar obra (S9 de
 * `odd/tasks/intervenciones-ux.md`).
 *
 * Vive una sola vez porque estaba copiado en los tres archivos y un párrafo
 * repetido no tiene CI: el día que cambie la redacción, dos se quedan viejas.
 * Lo único que la operadora lee antes de escribir un dato de un vecino, que
 * la regla 9 de `AGENTS.md` prohíbe en texto libre, es esto.
 */
export const AVISO_DE_PRIVACIDAD =
  "No anote nombres, teléfonos ni datos de vecinos.";

export function AvisoDePrivacidad({ id }: { id?: string }) {
  return (
    <p id={id} className={CLASES_DE_ETIQUETA}>
      {AVISO_DE_PRIVACIDAD}
    </p>
  );
}
