import { CeldaPrincipal, CLASES_DE_ETIQUETA, FilaDeTabla } from "@/shared/ui";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";

const enPlural = (n: number) => (n === 1 ? "domicilio" : "domicilios");

/**
 * S5 de `odd/tasks/territorio-ux.md`: los domicilios que cuelgan directo del
 * asentamiento -sin colonia de por medio- no aparecian en ninguna fila, asi
 * que las colonias sumaban menos que la pestana Domicilios. Esta fila los
 * cierra y entra a esa pestana, que es donde se ven.
 *
 * Va en tono de apoyo y con la palabra «Sin colonia» como nombre: no es una
 * colonia mas, es la ausencia de una, y sin ella la suma no cierra.
 */
export function FilaSinColonia({
  raizId,
  nodoId,
  directos,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  /** Los colgados directo del lugar; `undefined` si no se contaron. */
  directos: number | undefined;
}) {
  if (!directos) return null;

  return (
    <FilaDeTabla
      href={rutaDe({ raizId, nodoId, vista: "domicilios" })}
      etiquetaAccesible={`Sin colonia, ${directos} ${enPlural(directos)}`}
    >
      <span className="flex min-w-0 flex-col">
        <CeldaPrincipal>Sin colonia</CeldaPrincipal>
        <span className="text-[13px] text-caliza-apagada">
          Domicilios registrados directo en la cabecera
        </span>
      </span>
      <span className={CLASES_DE_ETIQUETA}>
        {directos} {enPlural(directos)}
      </span>
    </FilaDeTabla>
  );
}
