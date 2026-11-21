import { Aviso, EnlaceDeAccion } from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";

/**
 * El cuerpo de la pantalla sin permiso de exportacion (S15 y S16): dice que
 * rol hace falta y a quien pedirlo, con las mismas palabras que la pantalla
 * sin permiso de Usuarios — las dos las lee la misma operadora.
 *
 * El encabezado, la descripcion y la salida los pone la pagina: `(panel)`
 * envuelve esta pantalla como cualquier otra, asi que no desaparece. La
 * migaja no la lleva ninguna raiz de seccion (`raicesSinMigaja.test.ts`).
 */
export const SIN_PERMISO_DE_EXPORTACION =
  "Su rol no tiene permiso para exportar los datos del ayuntamiento.";

const A_QUIEN_PEDIR =
  "Exportar los datos del ayuntamiento lo hace el administrador municipal: pídale que cambie su rol si lo necesita. El padrón, los reportes y las constancias siguen disponibles.";

export function SinPermisoDeExportacion({ rol }: { rol: string }) {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4">
      <div className="flex flex-col gap-2">
        <Aviso tono="aviso">{SIN_PERMISO_DE_EXPORTACION}</Aviso>
        <p className="text-[13px] leading-[1.4] text-caliza-apagada">
          {`Su rol es ${etiquetaDeRol(rol)}. ${A_QUIEN_PEDIR}`}
        </p>
      </div>
      <EnlaceDeAccion href="/padron" variante="secundaria">
        Volver al padrón
      </EnlaceDeAccion>
    </div>
  );
}
