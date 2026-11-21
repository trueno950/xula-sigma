import type { Rol } from "@/shared/auth";
import type { UsuarioDelPanel } from "../domain";
import type { ParametrosDeUsuarios } from "./actions/destinoDeUsuarios";
import {
  type AvisoDeConfirmacion,
  avisoDeConfirmacion,
} from "./avisoDeConfirmacion";
import type { AvisoPendiente } from "./avisoPendiente";
import { avisoPendienteDeLaPeticion } from "./avisoPendienteEnCookie";
import type { ClaveMostrada } from "./claveMostrada";
import {
  claveMostradaDeLaPeticion,
  clavePorPedirDeLaPeticion,
} from "./claveTemporalEnCookie";
import { destinatarioDeLaClaveDeLaPeticion } from "./destinatarioDeLaClave";
import { mensajeDeError } from "./mensajesDeError";
import { permisosDeCuenta } from "./permisosDeCuenta";

/**
 * Lo que la pantalla de Usuarios anuncia en esta peticion, resuelto antes de
 * pintar nada. Vive aca y no en la ruta porque son cuatro mecanismos
 * distintos —la clave temporal, el aviso de la baja, los codigos de error y
 * la confirmacion— y la ruta quedaba con la mitad de su cuerpo decidiendo
 * textos.
 *
 * **La clave temporal** (S9 y S11), en tres desenlaces. Con JavaScript la
 * contrasenia no viaja en el payload, porque el router lo guarda y lo vuelve a
 * pintar al regresar con «Atras» (S4 de `usuarios-seguridad`): la pantalla
 * recibe solo el token -`por-pedir`- y la isla se la pide al Route Handler,
 * que la entrega y borra la cookie en el mismo viaje. Sin JavaScript, que es
 * una navegacion de documento, el proxy la traslada a una cabecera y la
 * borra: ahi si la tarjeta se pinta entera -`visible`-. Cuando el proxy ya
 * consumio la cookie, el `usuarioId` sale de la cookie del destinatario
 * —que nadie consume porque este estado **es** el de la recarga— y se busca
 * en el listado que esta misma peticion leyo bajo RLS: una cuenta de otro
 * municipio, o una que ya no esta, no se nombra. Si esa cookie tampoco esta
 * —pasaron los dos minutos— queda el texto generico de `avisoDeConfirmacion`.
 *
 * **El aviso de la baja** (S13 y S14) sigue el mismo mecanismo de un solo uso
 * que la clave: `?aviso=` trae el token y el proxy puso el `usuarioId` en una
 * cabecera, ya consumida la cookie.
 *
 * **Una sola confirmacion por hecho**: el exito de un alta o un
 * restablecimiento solo se anuncia junto a la contrasenia nueva (S11), y si
 * la tarjeta de «ya no se puede mostrar» esta en pantalla el texto generico
 * sobra porque diria lo mismo con otra redaccion. La baja no pasa por
 * `avisoDeConfirmacion`: la anuncia `AvisoDeAccion`, y solo en esta peticion.
 */

export type ActorDelPanel = { id: string; rol: Rol };

export type ClaveDeLaPeticion =
  | { tipo: "nada" }
  | { tipo: "visible"; mostrada: ClaveMostrada; usuario: UsuarioDelPanel }
  | {
      tipo: "por-pedir";
      token: string;
      usuario: UsuarioDelPanel;
      puedeRestablecer: boolean;
    }
  | {
      tipo: "sin-mostrar";
      usuario: UsuarioDelPanel;
      puedeRestablecer: boolean;
    };

export type AvisosDeLaPeticion = {
  clave: ClaveDeLaPeticion;
  confirmacion: AvisoDeConfirmacion | null;
  avisoYPersona: { aviso: AvisoPendiente; usuario: UsuarioDelPanel } | null;
  mensaje: string | null;
};

const puedeRestablecerDe = (
  actor: ActorDelPanel,
  usuario: UsuarioDelPanel,
): boolean => permisosDeCuenta(actor, usuario)?.puedeRestablecer ?? false;

/**
 * La clave que esta peticion todavia puede pedir, si el dueño esta en el
 * listado: la isla la pide al servidor y **solo asi** llega a la pantalla.
 *
 * `null` cuando no hay ninguna pendiente: ahi sigue el camino de la recarga,
 * que es el estado «ya no se puede mostrar».
 */
const clavePorPedir = async (
  token: string,
  usuarios: readonly UsuarioDelPanel[],
  actor: ActorDelPanel,
): Promise<ClaveDeLaPeticion | null> => {
  const usuarioId = await clavePorPedirDeLaPeticion(token);
  if (!usuarioId) return null;

  const usuario = usuarios.find((cuenta) => cuenta.id === usuarioId);

  return usuario
    ? {
        tipo: "por-pedir",
        token,
        usuario,
        puedeRestablecer: puedeRestablecerDe(actor, usuario),
      }
    : { tipo: "nada" };
};

const estadoDeLaClave = async (
  token: string | undefined,
  usuarios: readonly UsuarioDelPanel[],
  actor: ActorDelPanel,
): Promise<ClaveDeLaPeticion> => {
  const mostrada = token ? await claveMostradaDeLaPeticion(token) : null;

  if (mostrada) {
    const usuario = usuarios.find((cuenta) => cuenta.id === mostrada.usuarioId);

    return usuario ? { tipo: "visible", mostrada, usuario } : { tipo: "nada" };
  }

  const porPedir = token ? await clavePorPedir(token, usuarios, actor) : null;
  if (porPedir) return porPedir;

  const destinatario = await destinatarioDeLaClaveDeLaPeticion(token);
  const usuario = usuarios.find(
    (cuenta) => cuenta.id === destinatario?.usuarioId,
  );
  if (!usuario) return { tipo: "nada" };

  return {
    tipo: "sin-mostrar",
    usuario,
    puedeRestablecer: puedeRestablecerDe(actor, usuario),
  };
};

const resultadoDe = (
  clave: ClaveDeLaPeticion,
  parametros: ParametrosDeUsuarios,
): AvisoDeConfirmacion | null =>
  clave.tipo === "sin-mostrar"
    ? null
    : avisoDeConfirmacion({
        ok: parametros.ok,
        // `por-pedir` tambien la va a mostrar: la isla la trae en el mismo
        // instante, asi que el exito se anuncia igual (S11).
        hayClaveVisible: clave.tipo === "visible" || clave.tipo === "por-pedir",
      });

export const avisosDeLaPeticion = async ({
  parametros,
  usuarios,
  actor,
}: {
  parametros: ParametrosDeUsuarios;
  usuarios: readonly UsuarioDelPanel[];
  actor: ActorDelPanel;
}): Promise<AvisosDeLaPeticion> => {
  const clave = await estadoDeLaClave(parametros.clave, usuarios, actor);
  const aviso =
    parametros.ok === "baja"
      ? await avisoPendienteDeLaPeticion(parametros.aviso)
      : null;
  const usuario = aviso
    ? usuarios.find((cuenta) => cuenta.id === aviso.usuarioId)
    : undefined;

  return {
    clave,
    avisoYPersona: aviso && usuario ? { aviso, usuario } : null,
    // `?error=` lleva un codigo, no texto: la pantalla pone el mensaje
    // (`mensajesDeError.ts`). Un codigo desconocido no muestra nada.
    mensaje: mensajeDeError(parametros.error),
    confirmacion: resultadoDe(clave, parametros),
  };
};
