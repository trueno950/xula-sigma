import type { Rol } from "@/shared/auth";
import { Aviso, EnlaceDeAccion } from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";

/**
 * El cuerpo de la pantalla sin permiso de `/marca` (S16, hallazgo P2), con el
 * mismo molde que `SinPermisoDeUsuarios` (S15 de `usuarios-ux`, que el usuario
 * aprobo): dice cual es el rol de quien mira, cual hace falta, a quien
 * pedirlo y deja una salida.
 *
 * Antes era una sola oracion —«Su rol no tiene permiso para cambiar la
 * marca»— sin decir cual era ese rol ni a quien pedirle el cambio, y sin
 * ninguna salida. La migaja no va: `/marca` es una raiz de seccion
 * (`raicesSinMigaja.test.ts`), y el modulo activo ya lo marca la navegacion.
 */
export const DESCRIPCION_DE_MARCA =
  "El escudo y los colores con los que el municipio aparece en todo el sistema.";

const A_QUIEN_PEDIR =
  "Pida al administrador municipal el permiso para cambiar la marca. Si hace falta, su cuenta se cambia en Usuarios.";

/** Lo que el rol de quien mira no permite, dicho con su nombre. */
export const textoDeSinPermisoDeMarca = (rol: Rol): string =>
  `Su rol es ${etiquetaDeRol(rol)}: no cambia la marca del ayuntamiento.`;

export function SinPermisoDeMarca({ rol }: { rol: Rol }) {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4">
      <div className="flex flex-col gap-2">
        <Aviso tono="aviso">{textoDeSinPermisoDeMarca(rol)}</Aviso>
        <p className="text-[13px] leading-[1.4] text-caliza-apagada">
          {A_QUIEN_PEDIR}
        </p>
      </div>
      <EnlaceDeAccion href="/padron" variante="secundaria">
        Volver al padrón
      </EnlaceDeAccion>
    </div>
  );
}

/**
 * Sin sesion no hay rol que nombrar. `(panel)/layout.tsx` ya manda a
 * `/acceso` antes de llegar aca, asi que este caso es el borde por si el
 * contexto se cae entre el layout y la pagina.
 */
export function SinSesionDeMarca() {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4">
      <Aviso tono="aviso">
        Su rol no tiene permiso para cambiar la marca del ayuntamiento.
      </Aviso>
      <EnlaceDeAccion href="/padron" variante="secundaria">
        Volver al padrón
      </EnlaceDeAccion>
    </div>
  );
}
