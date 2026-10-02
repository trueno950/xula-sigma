import { Plus } from "@phosphor-icons/react/ssr";
import { EnlaceDeAccion } from "@/shared/ui";

/**
 * La accion de la entrada: dar de alta un asentamiento -un municipio suma
 * uno por ano-. El alta de domicilio vive dentro del lugar, en su pestana
 * Domicilios: el operador no sale del contexto de lo que esta viendo para
 * crear lo que esta viendo.
 */
export const accionesDeRaiz = ({
  puedeCrearLugar,
}: {
  puedeCrearLugar: boolean;
}) => {
  if (!puedeCrearLugar) return undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EnlaceDeAccion href="/territorio?accion=lugar" variante="primaria">
        <Plus size={18} weight="bold" aria-hidden="true" />
        Agregar asentamiento
      </EnlaceDeAccion>
    </div>
  );
};
