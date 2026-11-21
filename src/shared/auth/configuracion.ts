import { hashDeClave, verificarClave } from "./contrasenia";
import { LARGO_MINIMO } from "./reglasDeClave";

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
 * `rol` se declara para que `sesionActual()` lo devuelva: sin esto la
 * libreria no lo trae y `contextoActual()` tendria que ir a la base por un
 * dato que ya viaja en la sesion.
 *
 * `input: false` es lo que lo vuelve seguro. Con el valor por defecto
 * —`input: true`— `POST /api/auth/update-user` con `{"rol":"ADMIN_MUNICIPAL"}`
 * seria una escalada de privilegios servida por la libreria. Con `false`,
 * `parseInputData` corta antes de tocar la base y responde
 * `FIELD_NOT_ALLOWED` (`db/schema.mjs:65` en 1.6.29). Hay test que lo
 * provoca.
 */
const camposDeUsuario = {
  ...camposAyuntamiento,
  rol: { type: "string", required: false, input: false } as const,
};

/**
 * `modelName` no es cosmetico: el adaptador resuelve la tabla con
 * `schema[model]`, una busqueda por clave directa
 * (`@better-auth/drizzle-adapter/dist/index.mjs:92` en 1.6.29). Sin esto
 * busca `schema["user"]`, que no existe, y todo endpoint responde 500 con
 * **cuerpo vacio** — el motivo solo aparece si se le pasa un `logger`.
 */
export const MODELOS = {
  user: { modelName: "usuarios", additionalFields: camposDeUsuario },
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
  /**
   * Importado, no repetido. `reglasDeClave.ts` existe justamente para que
   * esta regla tenga una sola fuente: el formulario del cliente y esta
   * configuracion aplican la misma. Un `12` escrito aca quedaba en 12 el
   * dia que la politica sube a 14, y nada fallaba al divergir.
   */
  minPasswordLength: LARGO_MINIMO,
  password: {
    hash: hashDeClave,
    verify: ({ hash, password }: { hash: string; password: string }) =>
      verificarClave(hash, password),
  },
} as const;

/**
 * El limitador de ritmo **de la libreria** queda apagado: el del municipio es
 * el nuestro (`ritmo.ts`, `limitarRitmo.ts`).
 *
 * Better Auth lo trae prendido por defecto en produccion
 * (`enabled: options.rateLimit?.enabled ?? isProduction`,
 * `better-auth/dist/context/create-context.mjs:171` en 1.6.29), en memoria
 * (`:174` del mismo archivo, o sea por proceso) y con una regla especial de
 * **3 intentos cada 10 segundos** para `/sign-in*`
 * (`better-auth/dist/api/rate-limiter/index.mjs:370-376`, en 1.6.29).
 *
 * Esa llave es `ip|ruta`, y la IP sale de `x-forwarded-for` solo cuando trae
 * **exactamente un** salto: `getIPFromHeader` devuelve `null` si hay mas
 * (`@better-auth/core/dist/utils/ip.mjs:188` en 1.6.29), y sin IP la llave es
 * una sola compartida por proceso — el propio codigo lo dice y avisa con
 * `no-trusted-ip` (`better-auth/dist/api/rate-limiter/index.mjs:281-287`, en
 * 1.6.29)—. En el despliegue real, con el proxy delante, eso es **todo un
 * ayuntamiento limitado a tres accesos cada diez segundos**, con un 429 en
 * ingles que ninguna pantalla nuestra traduce, que no cuenta por tenant y que
 * no se puede vaciar.
 *
 * Lo encontro el E2E: al repetir los casos, el cuarto acceso seguido de la
 * misma corrida recibia `{"message":"Too many requests…"}`. Ver
 * `ritmoDeBetterAuth.integration.test.ts`.
 *
 * Apagarlo no deja superficie de fuerza bruta sin cubrir: el unico endpoint
 * adivinable es `/sign-in/email`, y lo limita el nuestro antes de construir la
 * instancia (`app/api/auth/[...all]/route.ts`); las demas rutas que la
 * libreria protegia estan cerradas (sin alta, sin envio de correo,
 * `/change-password` apagado, `/update-user` con su propio rechazo).
 */
export const RITMO_DE_BETTER_AUTH = { enabled: false } as const;
