import type { Rol } from "@/shared/auth";
import { Aviso, EnlaceDeAccion, PantallaDeMensaje } from "@/shared/ui";
import { tituloDelRol } from "./descripcionesDeRol";

/**
 * El cuerpo de la pantalla sin permiso de Usuarios (S15 de `usuarios-ux`,
 * hallazgos P1, P2 y P3), una sola vez para las dos rutas del modulo
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`, muestra).
 *
 * Antes era el mismo parrafo copiado en `/usuarios` y en `/usuarios/alta`,
 * suelto y sin encabezado: quien llegaba con un rol que no administra cuentas
 * no sabia donde estaba ni a quien pedirle acceso. Ahora el aviso vive aca y
 * la pagina pone lo que es suyo —encabezado, migaja y, si el rol alcanzara,
 * la accion—, que es lo que la pantalla conserva del panel.
 *
 * **La migaja no la decide este modulo**: una raiz de seccion no la lleva
 * (`raicesSinMigaja.test.ts`), asi que `/usuarios` muestra encabezado y
 * descripcion, y `/usuarios/alta` agrega la suya.
 */

/** La descripcion de la pantalla, en un solo lugar: la usan las dos ramas. */
export const DESCRIPCION_DE_USUARIOS =
  "Quién entra a este panel y con qué rol. Las cuentas son de este ayuntamiento.";

const A_QUIEN_PEDIR =
  "Pida al administrador municipal que cambie su rol si necesita entrar aquí. El padrón, los reportes y las constancias siguen disponibles.";

/** Lo que el rol de quien mira no permite, dicho con su nombre. */
export const textoDeSinPermiso = (rol: Rol): string =>
  `Su rol es ${tituloDelRol(rol)}: no administra cuentas.`;

export function SinPermisoDeUsuarios({ rol }: { rol: Rol }) {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4">
      <div className="flex flex-col gap-2">
        <Aviso tono="aviso">{textoDeSinPermiso(rol)}</Aviso>
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
 * contexto se cae entre el layout y la pagina; conserva el mensaje que la
 * pantalla daba antes de S15.
 */
export function PantallaSinSesion() {
  return (
    <PantallaDeMensaje
      mensaje="Su rol no tiene permiso para administrar usuarios."
      accion={
        <EnlaceDeAccion href="/padron" variante="secundaria">
          Volver al padrón
        </EnlaceDeAccion>
      }
    />
  );
}
