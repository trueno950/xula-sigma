import { PencilSimple, Prohibit } from "@phosphor-icons/react/ssr";
import { ItemDeAccion } from "@/shared/ui";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import {
  FormularioDeBajaDeZona,
  FormularioDeRenombreDeZona,
} from "./FormulariosDeZona";

const GRUPO = "acciones-de-zona";

/**
 * Lo que se le hace a la zona misma, en `<details>` exclusivos como las
 * acciones de una calle: la baja, irreversible, va ultima y separada.
 */
export function AccionesDeZona({ zona }: { zona: ZonaGuardada }) {
  return (
    <div className="flex flex-col gap-1">
      <ItemDeAccion
        grupo={GRUPO}
        etiqueta="Renombrar"
        Icono={PencilSimple}
        abierto={false}
      >
        <FormularioDeRenombreDeZona zonaId={zona.id} nombre={zona.nombre} />
      </ItemDeAccion>
      <div className="mt-2 border-t border-caliza-divisor pt-2">
        <ItemDeAccion
          grupo={GRUPO}
          etiqueta="Dar de baja"
          Icono={Prohibit}
          abierto={false}
          destructiva
        >
          <FormularioDeBajaDeZona zonaId={zona.id} nombre={zona.nombre} />
        </ItemDeAccion>
      </div>
    </div>
  );
}
