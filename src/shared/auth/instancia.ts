import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import { bdSobreTransaccion } from "./bdSobreTransaccion";
import { ACCESO_POR_CORREO, MODELOS } from "./configuracion";
import * as esquema from "./esquema";
import { usuarios } from "./esquema";
import { origenDesde } from "./origen";

/**
 * Punto unico de construccion de Better Auth.
 *
 * La restriccion que gobierna el archivo: `sign-up.mjs:166` (en 1.6.29)
 * llama `findUserByEmail(correo)`, un SELECT sin filtro de tenant en codigo
 * ajeno. Ese SELECT solo es correcto adentro de una transaccion con
 * `app.tenant` fijado. No alcanza con que las llamadas pasen por
 * `withTenant`: tiene que ser imposible que alguna no pase.
 *
 * De ahi que `construirInstancia` sea privada: no hay identificador que
 * importar para armar una instancia por fuera. Lo que sale del archivo
 * —`conAuth` y `manejarAuth`— abre `withTenant` primero, siempre. Mismo
 * criterio que la `const bd` de `withTenant.ts`: el invariante lo sostiene
 * el lenguaje, no la disciplina de quien revisa.
 *
 * La otra reja es de build: dependency-cruiser prohibe importar
 * `better-auth` fuera de `shared/auth`.
 */

const secreto = process.env.BETTER_AUTH_SECRET;

if (!secreto) {
  throw new Error(
    "Falta BETTER_AUTH_SECRET. Firma las cookies de sesion: sin el, " +
      "cualquiera falsifica una. Ver .env.example.",
  );
}

/** Agrega el tenant a la fila que la libreria esta por escribir. */
const conTenantDe =
  (ayuntamientoId: AyuntamientoId) =>
  <T extends Record<string, unknown>>(registro: T) => ({
    data: { ...registro, ayuntamientoId },
  });

type ConTenant = ReturnType<typeof conTenantDe>;

/**
 * Una persona dada de baja no abre sesion. Se verifica aca y no en la
 * pantalla porque este es el unico punto por el que pasan todos los caminos
 * de alta de sesion.
 *
 * Devolver `false` aborta la creacion: `createWithHooks` retorna `null`
 * (`db/with-hooks.mjs:17` en 1.6.29). El acceso falla **sin decir por que**
 * — un mensaje distinto para "dado de baja" confirmaria que la cuenta
 * existe.
 */
const soloSiSigueActiva =
  (tx: TransaccionTenant, conTenant: ConTenant) =>
  async (sesion: { userId: string }) => {
    const [persona] = await tx
      .select({ bajaEn: usuarios.bajaEn })
      .from(usuarios)
      .where(eq(usuarios.id, sesion.userId))
      .limit(1);

    if (!persona || persona.bajaEn !== null) return false;

    return conTenant(sesion);
  };

/**
 * Los hooks que ponen el tenant en cada fila que escribe la libreria.
 *
 * Viven aparte del objeto de configuracion porque `construirInstancia`
 * pasaba de las 30 lineas por arrastrarlos.
 */
function ganchosDeBd(tx: TransaccionTenant, ayuntamientoId: AyuntamientoId) {
  const conTenant = conTenantDe(ayuntamientoId);

  return {
    /**
     * Con `disableSignUp` este hook no corre hoy: Better Auth no crea
     * usuarios. Se deja puesto porque el dia que se habilite algun camino
     * de alta por la libreria, el tenant tiene que salir del servidor igual
     * que en los otros tres.
     *
     * No pone `rol` a proposito. Un valor por defecto aca seria el rol que
     * termina teniendo todo el mundo; sin el, la columna NOT NULL hace
     * fallar el alta hasta que alguien elija uno a conciencia.
     */
    user: {
      create: { before: async (u: Record<string, unknown>) => conTenant(u) },
    },
    account: {
      create: { before: async (a: Record<string, unknown>) => conTenant(a) },
    },
    verification: {
      create: { before: async (v: Record<string, unknown>) => conTenant(v) },
    },
    session: { create: { before: soloSiSigueActiva(tx, conTenant) } },
  };
}

function construirInstancia(
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
  origen: string,
) {
  return betterAuth({
    baseURL: origen,
    secret: secreto,
    database: drizzleAdapter(bdSobreTransaccion(tx), {
      provider: "pg",
      schema: esquema,
    }),
    advanced: { database: { generateId: "uuid" } },
    emailAndPassword: ACCESO_POR_CORREO,
    ...MODELOS,
    databaseHooks: ganchosDeBd(tx, ayuntamientoId),
  });
}

/**
 * El unico punto donde se construye una instancia, y siempre adentro de
 * `withTenant`. No recibe `ayuntamientoId`: lo resuelve del contexto de
 * servidor, nunca de la peticion.
 *
 * Interno a `shared/auth` — no se reexporta desde `index.ts`. Lo que la
 * superficie publica ofrece es `manejarAuth` y `sesionActual`.
 *
 * @param origen Cada municipio tiene el suyo, asi que sale del request y no
 *   de una variable de entorno: la cookie se acota a `ticul.dominio` y no
 *   cruza a `motul.dominio`. Un Host ajeno no llega hasta aca —
 *   `proxy.ts` responde 404 cuando `leerSubdominio` da `invalido`.
 */
export async function conAuth<T>(
  origen: string,
  trabajo: (auth: ReturnType<typeof construirInstancia>) => Promise<T>,
): Promise<T> {
  const { id } = await ayuntamientoActual();

  return withTenant(id, (tx) => trabajo(construirInstancia(tx, id, origen)));
}

/**
 * La puerta de las rutas de autenticacion.
 *
 * El handler entero corre adentro de la transaccion. No hay operacion
 * —lectura o escritura, por transaccion o directa— que pueda salir del
 * alcance, porque no hay nada de Better Auth ejecutandose afuera.
 */
export function manejarAuth(request: Request): Promise<Response> {
  const origen = origenDesde(request.headers, new URL(request.url).origin);

  return conAuth(origen, (auth) => auth.handler(request));
}
