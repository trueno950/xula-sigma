import { ListMagnifyingGlass, MapPin, Plus } from "@phosphor-icons/react/ssr";
import { EnlaceDeAccion } from "@/shared/ui";

/**
 * Las acciones de la entrada: registrar un domicilio es la tarea de todos
 * los dias y va primaria; el alta de un asentamiento pasa a secundaria
 * -un municipio suma uno por ano-. La que ya esta abierta no repite su
 * enlace, para no dejar dos primarias en pantalla. Ver el registro es
 * lectura y llega a cualquier rol. El alta de domicilio tiene dos entradas;
 * ver `openspec/changes/direcciones-y-zonas-operativas/design.md`, seccion 3.
 */
export const accionesDeRaiz = ({
  puedeCrearLugar,
  accion,
}: {
  puedeCrearLugar: boolean;
  accion: string | undefined;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!puedeCrearLugar || accion === "domicilio" ? null : (
        <EnlaceDeAccion href="/territorio?accion=domicilio" variante="primaria">
          <MapPin size={18} weight="bold" aria-hidden="true" />
          Registrar domicilio
        </EnlaceDeAccion>
      )}
      {!puedeCrearLugar || accion === "lugar" ? null : (
        <EnlaceDeAccion href="/territorio?accion=lugar" variante="secundaria">
          <Plus size={18} weight="bold" aria-hidden="true" />
          Agregar asentamiento
        </EnlaceDeAccion>
      )}
      <EnlaceDeAccion href="/territorio/domicilios" variante="secundaria">
        <ListMagnifyingGlass size={18} weight="bold" aria-hidden="true" />
        Ver registro de domicilios
      </EnlaceDeAccion>
    </div>
  );
};
