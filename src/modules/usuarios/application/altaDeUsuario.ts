import { generarClaveTemporal } from "@/shared/auth/claveTemporal";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import { esRolAsignable, RolNoAsignableError } from "../domain";
import type { DirectorioDeUsuarios } from "./puertos";

/**
 * El alta de una cuenta del ayuntamiento desde el panel (S3 y S4).
 *
 * **La clave la genera el sistema y no viaja en el formulario.** Por eso no
 * es un parametro: si lo fuera, el dia que alguien pase la del formulario el
 * alta la entrega y nadie revisa que sea fuerte. Se devuelve para que la
 * accion la muestre una sola vez.
 *
 * El tenant sale del contexto del actor —de ahi el `withTenant` de aca—, asi
 * que no hay forma de que la fila quede en un municipio y el actor en otro.
 */

/**
 * El correo entra en minusculas y sin espacios.
 *
 * **Es la credencial de entrada**, y Better Auth la busca en minusculas
 * (`internal-adapter.mjs:483-487` en 1.6.29, `value: email.toLowerCase()`),
 * asi que `Operador@Motul.mx` y `operador@motul.mx` abren la misma cuenta
 * para el acceso pero son dos filas distintas para el indice unico de
 * Postgres. Una de las dos quedaria muda: existe, tiene clave, y nadie
 * puede entrar con ella. Normalizar en el alta cierra esa asimetria del
 * lado que escribe; el adaptador compara con `lower(email)` del lado que
 * lee, porque las filas viejas ya estan escritas.
 */
const emailNormalizado = (email: string): string => email.trim().toLowerCase();

export type UsuarioDadoDeAlta = {
  usuarioId: string;
  /** Se muestra una sola vez; no se guarda en claro en ningun lado. */
  claveTemporal: string;
};

export function crearAltaDeUsuario(directorio: DirectorioDeUsuarios) {
  return async function altaDeUsuario(
    contexto: ContextoActual,
    datos: { nombre: string; email: string; rol: string },
  ): Promise<UsuarioDadoDeAlta> {
    if (!puedeAdministrarUsuarios(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    /**
     * El `rol` llega como texto del formulario y no se castea:
     * `esRolAsignable` es la frontera que lo convierte en uno de los dos
     * roles del alta. Un `as Rol` aca dejaria entrar un `ADMIN_MUNICIPAL`
     * escrito a mano, que es exactamente lo que S3 prohibe. Se guarda en una
     * constante porque el estrechamiento de una propiedad no sobrevive a la
     * transaccion, que es un callback.
     */
    const { rol } = datos;

    if (!esRolAsignable(rol)) throw new RolNoAsignableError();

    const claveTemporal = generarClaveTemporal();
    const { id } = await withTenant(contexto.ayuntamientoId, (tx) =>
      directorio.darDeAlta(tx, contexto.ayuntamientoId, {
        nombre: datos.nombre,
        email: emailNormalizado(datos.email),
        clave: claveTemporal,
        rol,
      }),
    );

    return { usuarioId: id, claveTemporal };
  };
}
