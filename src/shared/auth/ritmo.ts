import { createHash } from "node:crypto";
import type { TipoIntento } from "./intentosAcceso";

/**
 * La regla de la limitacion de ritmo del acceso: la clave que se guarda y
 * el limite. **Sin base de datos**, para que la suite `unit` la pueda correr
 * —contar la ventana necesita Postgres y vive en `limitarRitmo.ts`.
 *
 * El corte no es por comodidad: importar `withTenant` exige `DATABASE_URL`
 * al cargarse, y arrastrarlo aca haria fallar todo test de la ruta que solo
 * quiera verificar el borde. Es el mismo corte que separa `contexto.ts` de
 * `withTenant.ts` en tenancy.
 *
 * **No se usa el limitador de Better Auth**, por dos motivos: su almacen en
 * memoria muere con la instancia y aca se construye una por request; y su
 * almacen en base crearia una tabla `rateLimit` sin `ayuntamiento_id`, o
 * sea fuera del regimen RLS de todo el proyecto. Este vive en una tabla con
 * politica, GRANT y test de aislamiento como cualquier otra.
 *
 * **Ritmo, nunca bloqueo.** No hay columna `bloqueadoHasta` y no la va a
 * haber: un bloqueo persistente se puede usar para dejar afuera a un
 * companiero justo el dia que hay que emitir una constancia. La ventana se
 * vacia sola con el tiempo y nadie tiene que ir a destrabar a nadie.
 */

export const VENTANA_MINUTOS = 15;

/**
 * Dos ventanas separadas y con numeros distintos.
 *
 * 5 por correo frena la prueba de contrasenias sin dejar afuera a quien se
 * equivoca dos veces. 20 por IP tolera que el palacio entero salga por una
 * sola conexion — contarlas juntas dejaria al municipio afuera por el uso
 * normal.
 */
export const LIMITES = { correo: 5, ip: 20 } as const;

const pimienta = process.env.PIMIENTA_INTENTOS;

if (!pimienta) {
  throw new Error(
    "Falta PIMIENTA_INTENTOS. Es el secreto que hace que la tabla de " +
      "intentos no sea una lista de quien tiene cuenta en cada municipio. " +
      "Ver .env.example.",
  );
}

/**
 * Lo que se guarda: `sha256(valor + pimienta)`, **nunca el correo ni la IP
 * en claro**.
 *
 * La pimienta vive en el entorno y no en la base a proposito. Sin ella,
 * cualquiera con lectura de la tabla confirma si un correo intento entrar
 * —basta con hashearlo y comparar— y la tabla de conteo se vuelve un
 * directorio de quien tiene cuenta en cada municipio.
 *
 * Se normaliza antes de hashear: sin eso, `Juan@X.com` y `juan@x.com` abren
 * dos ventanas para la misma cuenta y probar variantes de mayusculas
 * multiplica el limite.
 */
export const claveDe = (valor: string) =>
  createHash("sha256")
    .update(`${valor.trim().toLowerCase()}${pimienta}`)
    .digest("hex");

/** El conteo que entra es el de intentos **previos**, de ahi el `>=`. */
export const superaElLimite = (tipo: TipoIntento, conteo: number) =>
  conteo >= LIMITES[tipo];

export class RitmoExcedidoError extends Error {
  readonly codigo = "RITMO_EXCEDIDO";

  constructor(readonly tipo: TipoIntento) {
    super("Demasiados intentos. Espere unos minutos y vuelva a intentar.");
    this.name = "RitmoExcedidoError";
  }
}
