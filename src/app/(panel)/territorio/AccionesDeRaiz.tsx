import { MapPin } from "@phosphor-icons/react/ssr";
import { conAnclaDeAlta } from "@/modules/territorio/ui/anclaDeAlta";
import { EnlaceDeAccion } from "@/shared/ui";

/**
 * La accion de la cabecera de la entrada: registrar un domicilio es la
 * tarea de todos los dias y es la unica primaria. El alta de un
 * asentamiento -un municipio suma uno por ano- baja al pie del arbol
 * (`VistaDeRaices`), y el registro y las zonas son enlaces de contexto
 * (`EnlacesDeLaEntrada`). Con el alta ya abierta no se repite el enlace.
 * El alta de domicilio tiene dos entradas; ver
 * `openspec/changes/direcciones-y-zonas-operativas/design.md`, seccion 3.
 */
export const accionesDeRaiz = ({
  puedeCrearLugar,
  accion,
}: {
  puedeCrearLugar: boolean;
  accion: string | undefined;
}) => {
  if (!puedeCrearLugar || accion === "domicilio") return null;

  return (
    <div className="flex max-sm:[&>a]:w-full">
      <EnlaceDeAccion
        href={conAnclaDeAlta("/territorio?accion=domicilio")}
        variante="primaria"
      >
        <MapPin size={18} weight="bold" aria-hidden="true" />
        Registrar domicilio
      </EnlaceDeAccion>
    </div>
  );
};
