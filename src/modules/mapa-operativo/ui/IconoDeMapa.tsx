import type { ClaveDeIcono } from "../domain";
import { TRAZOS_DE_ICONO } from "./iconosDelMapa";

type Props = { clave: ClaveDeIcono; tamano?: number };

/**
 * El icono de la leyenda y de la lista, con los mismos trazos que el pin de
 * Leaflet (`iconosDelMapa.ts`). `aria-hidden` porque el tipo ya va escrito al
 * lado: el icono acompaña, no informa solo.
 */
export function IconoDeMapa({ clave, tamano = 18 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 text-caliza-tinta"
    >
      {TRAZOS_DE_ICONO[clave].map((trazo) => (
        <path key={trazo} d={trazo} />
      ))}
    </svg>
  );
}
