import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { hashDeClave } from "./contrasenia";
import { cuentas, usuarios } from "./esquema";
import type { Rol } from "./roles";

/**
 * Alta de una persona: la fila de `usuarios` y su credencial, en la misma
 * transaccion.
 *
 * **No pasa por Better Auth, y es a proposito.** Su endpoint de registro
 * esta apagado (`disableSignUp`, ver `instancia.ts`): en un sistema
 * municipal el alta la autoriza alguien, no la decide quien llega a la
 * URL. Better Auth se queda con el acceso y la sesion, que es donde
 * aporta.
 *
 * Recibe el `tx` en vez de abrir uno: quien da de alta suele estar
 * haciendo algo mas en la misma transaccion —la traza en bitacora, el
 * primer ADMIN_MUNICIPAL de un municipio recien creado— y partirlo en dos
 * transacciones deja municipios sin nadie que pueda entrar.
 *
 * El `rol` es un parametro obligatorio y sin valor por defecto. Un default
 * aca seria el rol que termina teniendo todo el mundo el dia que alguien
 * llama la funcion sin pensarlo.
 */
export async function altaDePersona(
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
  datos: { nombre: string; email: string; clave: string; rol: Rol },
): Promise<{ id: string }> {
  // Antes de escribir nada: si la clave es debil, no se crea la persona y
  // despues su credencial falla dejando un usuario sin forma de entrar.
  const digest = await hashDeClave(datos.clave);

  const [persona] = await tx
    .insert(usuarios)
    .values({
      ayuntamientoId,
      name: datos.nombre,
      email: datos.email,
      rol: datos.rol,
    })
    .returning({ id: usuarios.id });

  if (!persona) throw new Error("No se pudo dar de alta a la persona.");

  await tx.insert(cuentas).values({
    ayuntamientoId,
    userId: persona.id,
    /**
     * Para el proveedor `credential`, Better Auth guarda el id del usuario
     * como `accountId` (`sign-up.mjs:239` en 1.6.29). Ponerle otra cosa
     * haria que el acceso no encuentre la credencial.
     */
    accountId: persona.id,
    providerId: "credential",
    password: digest,
  });

  return persona;
}
