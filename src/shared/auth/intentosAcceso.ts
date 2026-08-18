import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  columnaTenant,
  enumerado,
  politicaTenant,
} from "@/shared/tenancy/esquema";

/**
 * La quinta tabla de autenticacion, y la unica que no es de Better Auth.
 * Vive aparte de `esquema.ts` por eso: ahi estan las que impone la
 * libreria, aca la que decidimos nosotros.
 */

/** Las dos ventanas de la limitacion de ritmo se cuentan por separado. */
export const TIPOS_INTENTO = ["correo", "ip"] as const;
export type TipoIntento = (typeof TIPOS_INTENTO)[number];

/**
 * Intentos de acceso, para la ventana corrediza de limitacion de ritmo.
 *
 * Se guarda `sha256(valor + pimienta)`, **nunca el correo ni la IP en
 * claro**: es una tabla de conteo, no un registro de quien intento entrar.
 *
 * **No existe columna `bloqueadoHasta`, y es a proposito.** Se limita el
 * ritmo, nunca se bloquea la cuenta: un bloqueo persistente se puede usar
 * para dejar afuera a un companiero justo el dia que hay que emitir. Sin
 * la columna, no se puede introducir por configuracion.
 */
export const intentosAcceso = pgTable(
  "intentos_acceso",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    clave: text().notNull(),
    // Un valor fuera del conjunto —`"email"`, `"IP"`— abriria una tercera
    // ventana que nadie cuenta: el limitador dejaria de limitar sin que
    // nada falle. De ahi el CHECK.
    tipo: text().$type<TipoIntento>().notNull(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("intentos_acceso_ventana_idx").on(
      t.ayuntamientoId,
      t.clave,
      t.ocurridoEn,
    ),
    check("intentos_acceso_tipo_valido", enumerado("tipo", TIPOS_INTENTO)),
    politicaTenant("intentos_acceso"),
  ],
).enableRLS();
