import { hashDeClave, verificarClave } from "./contrasenia";

/**
 * La configuracion declarativa de Better Auth: lo que no depende de la
 * transaccion ni del municipio.
 *
 * Vive aparte de `instancia.ts` porque son constantes, no logica, y juntas
 * empujaban ese archivo por encima de las 200 lineas. Lo que queda alla es
 * la construccion y las dos puertas.
 */

/**
 * `required: false` a nivel de libreria, NOT NULL a nivel de base.
 *
 * Con `required: true` Better Auth valida el campo como **entrada del
 * cliente** antes de correr el hook, y responde `MISSING_FIELD` aunque este
 * declarado `input: false`. Pedirle el tenant al cliente es exactamente lo
 * que prohibe el invariante 1.
 */
const camposAyuntamiento = {
  ayuntamientoId: { type: "string", required: false, input: false } as const,
};

/**
 * `modelName` no es cosmetico: el adaptador resuelve la tabla con
 * `schema[model]`, una busqueda por clave directa
 * (`@better-auth/drizzle-adapter/dist/index.mjs:92` en 1.6.29). Sin esto
 * busca `schema["user"]`, que no existe, y todo endpoint responde 500 con
 * **cuerpo vacio** — el motivo solo aparece si se le pasa un `logger`.
 */
export const MODELOS = {
  user: { modelName: "usuarios", additionalFields: camposAyuntamiento },
  session: { modelName: "sesiones", additionalFields: camposAyuntamiento },
  account: { modelName: "cuentas", additionalFields: camposAyuntamiento },
  verification: {
    modelName: "verificaciones",
    additionalFields: camposAyuntamiento,
  },
} as const;

export const ACCESO_POR_CORREO = {
  enabled: true,
  /**
   * **Sin auto-registro.** El alta la hace quien tiene autoridad (diseno
   * D7), no cualquiera que llegue a la URL. Con el endpoint abierto, un
   * tercero que visite `motul.dominio/api/auth/sign-up/email` se crea una
   * cuenta en Motul y queda adentro del municipio.
   *
   * Las personas entran por `altaDePersona`, que corre bajo `withTenant` y
   * exige un rol explicito.
   */
  disableSignUp: true,
  minPasswordLength: 12,
  password: {
    hash: hashDeClave,
    verify: ({ hash, password }: { hash: string; password: string }) =>
      verificarClave(hash, password),
  },
} as const;
