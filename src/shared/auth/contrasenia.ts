import { hash, verify } from "@node-rs/argon2";
import { LARGO_MINIMO } from "./reglasDeClave";

/** Reexportada para que quien ya la tomaba de aca no tenga que cambiar. */
export { LARGO_MINIMO };

/**
 * Hasheo de contrasenias con argon2id.
 *
 * Es el unico modulo de `shared/auth` que no depende de Better Auth: se le
 * pasa a `emailAndPassword.password` y tambien sobrevive intacto en el
 * repliegue del diseno (seccion 2), donde se invoca directo.
 */

export class ClaveDebilError extends Error {
  readonly codigo = "CLAVE_DEBIL";

  constructor() {
    super(`La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`);
    this.name = "ClaveDebilError";
  }
}

/**
 * `Algorithm` es un const enum ambiental y `verbatimModuleSyntax` impide
 * importarlo. Se usa el literal, verificado contra
 * `@node-rs/argon2/index.d.ts` en 2.1.0: Argon2d = 0, Argon2i = 1,
 * **Argon2id = 2**.
 *
 * El numero no se adivina. El de al lado tambien es valido y seleccionaria
 * otro algoritmo sin que nada falle — de ahi el test que exige el prefijo
 * `$argon2id$` en el digest.
 */
const ARGON2ID = 2;

export async function hashDeClave(clave: string): Promise<string> {
  // Se recorta antes de medir: dos espacios no son dos caracteres de
  // seguridad, y sin esto una clave de once pasa el minimo.
  if (clave.trim().length < LARGO_MINIMO) throw new ClaveDebilError();

  return hash(clave, { algorithm: ARGON2ID });
}

/**
 * Devuelve `false` ante un digest ilegible en vez de propagar.
 *
 * Una fila con el hash danado es una credencial que no verifica, no una
 * falla del sistema: si saliera como excepcion, el borde la convertiria en
 * 500 y el motivo delataria que el problema esta en la base.
 *
 * **El `catch` no es silencioso, y no puede serlo.** Una clave equivocada
 * NO lanza: `verify` devuelve `false` (cubierto por test). O sea que llegar
 * aca significa que paso algo anormal —digest corrupto en la base, fallo
 * de la libreria nativa— y eso hay que poder verlo. Sin el registro, un
 * `catch` vacio convierte cualquier falla en "contrasenia incorrecta" y
 * nadie se entera nunca.
 *
 * Se sigue devolviendo `false` a proposito: ante la duda, no se entra.
 */
export async function verificarClave(
  digest: string,
  clave: string,
): Promise<boolean> {
  try {
    return await verify(digest, clave);
  } catch (error) {
    // Sin la clave ni el digest: lo unico que interesa es que fallo y por
    // que, y ninguno de los dos aporta a eso.
    console.error("[auth] no se pudo verificar el digest", {
      motivo: error instanceof Error ? error.name : typeof error,
    });

    return false;
  }
}
