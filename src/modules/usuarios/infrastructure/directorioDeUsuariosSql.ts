import { sql } from "drizzle-orm";
import { altaDePersona } from "@/shared/auth/alta";
import { usuarios } from "@/shared/auth/esquema";
import type { DirectorioDeUsuarios } from "../application";
import { CorreoYaRegistradoError } from "../domain";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

/**
 * El adaptador sobre las tablas de Better Auth.
 *
 * **La lectura no filtra por `ayuntamiento_id`**: la politica de `usuarios`
 * acota el `SELECT` al tenant de la transaccion que abre el caso de uso, y
 * escribirlo a mano sugeriria que el aislamiento depende de acordarse. Las
 * columnas se listan una por una porque al lado vive `cuentas`, y un
 * `select()` pelado es la forma en que un hash de contrasenia termina en una
 * pantalla.
 *
 * **El alta reusa `altaDePersona`** (`shared/auth/alta.ts`), que es la unica
 * primitiva que escribe `usuarios` mas su credencial en la misma
 * transaccion. Lo unico que agrega este archivo es traducir el choque de
 * correo duplicado a un error del dominio: eso es de Postgres, no del caso
 * de uso.
 */

/**
 * Los dos indices unicos que pueden frenar un alta. El exacto
 * (`usuarios_tenant_email_idx`) y el que compara por `lower(email)`
 * (`usuarios_tenant_email_lower_idx`, migracion `0024`): el segundo es el
 * que gana la carrera que el chequeo de abajo no puede ganar, porque dos
 * transacciones simultaneas no se ven entre si.
 */
const RESTRICCIONES_DE_CORREO = [
  "usuarios_tenant_email_idx",
  "usuarios_tenant_email_lower_idx",
] as const;
export const directorioDeUsuariosSql: DirectorioDeUsuarios = {
  listar: (tx) =>
    tx
      .select({
        id: usuarios.id,
        nombre: usuarios.name,
        email: usuarios.email,
        rol: usuarios.rol,
        bajaEn: usuarios.bajaEn,
      })
      .from(usuarios)
      /**
       * Quienes siguen activos primero: son los unicos sobre los que se
       * puede operar, y una baja se busca, no se recorre. `false` ordena
       * antes que `true` en SQL, de ahi el `IS NOT NULL`.
       */
      .orderBy(sql`${usuarios.bajaEn} is not null`, usuarios.name)
      .then((filas) =>
        filas.map(({ bajaEn, ...persona }) => ({
          ...persona,
          dadoDeBaja: bajaEn !== null,
          bajaEn,
        })),
      ),

  darDeAlta: async (tx, ayuntamientoId, datos) => {
    /**
     * La unicidad real de `usuarios_tenant_email_idx` es exacta, y las
     * filas escritas antes de normalizar (o por otro camino) pueden tener
     * mayusculas. Comparar por `lower(email)` es lo que hace que esa fila
     * vieja siga siendo la misma persona y no una cuenta paralela muda.
     */
    const [existente] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(sql`lower(${usuarios.email}) = ${datos.email.toLowerCase()}`)
      .limit(1);

    if (existente) throw new CorreoYaRegistradoError();

    try {
      // El alta del panel siempre emite una clave temporal —la genera el caso
      // de uso, no el formulario—, asi que la credencial nace marcada: caduca
      // a las 24 horas y obliga a cambiarla al entrar (S1 y S2).
      return await altaDePersona(tx, ayuntamientoId, {
        ...datos,
        claveTemporal: true,
      });
    } catch (error) {
      if (
        RESTRICCIONES_DE_CORREO.some((nombre) =>
          violaRestriccionUnica(error, nombre),
        )
      ) {
        throw new CorreoYaRegistradoError();
      }

      throw error;
    }
  },
};
