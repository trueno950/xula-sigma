import { Key } from "@phosphor-icons/react/ssr";
import { Aviso, Boton } from "@/shared/ui";
import type { UsuarioDelPanel } from "../domain";
import { restablecerContraseniaAction } from "./actions/restablecerContraseniaAction";

/**
 * S11 de `usuarios-ux` (hallazgo R1) en su segundo estado: la clave ya no se
 * puede mostrar. No se anuncia un exito vacio —«La contraseña quedo
 * restablecida» sin la contrasenia deja a la operadora sin nada con que
 * trabajar—: se dice de quien era, que ya no esta, y cual es el camino para
 * tener otra
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`, muestra).
 *
 * **Restablecer otra vez solo si esta permitido.** `puedeRestablecer` es la
 * misma decision que corre el servidor —`permisosDeCuenta`, que deja afuera
 * la propia cuenta (S1 y T3)—; pintar el boton para una cuenta que la accion
 * va a rechazar le cambia a la operadora un camino por un error.
 *
 * De quien era sale de la cookie del destinatario, buscada en el listado que
 * esta misma peticion leyo bajo RLS: ver `destinatarioDeLaClave.ts`.
 */
export function ClaveQueYaNoSePuedeMostrar({
  usuario,
  puedeRestablecer,
}: {
  usuario: UsuarioDelPanel;
  puedeRestablecer: boolean;
}) {
  return (
    <section className="flex flex-col items-start gap-3">
      <Aviso tono="aviso">
        {textoDeLaClaveQueYaNoSeMuestra(usuario.nombre)}
      </Aviso>
      {puedeRestablecer ? (
        <form action={restablecerContraseniaAction}>
          <input type="hidden" name="usuarioId" value={usuario.id} />
          <Boton type="submit" variante="secundaria">
            <Key size={18} weight="bold" aria-hidden="true" />
            {`Restablecer la contraseña de ${usuario.nombre}`}
          </Boton>
        </form>
      ) : null}
    </section>
  );
}

export const textoDeLaClaveQueYaNoSeMuestra = (nombre: string): string =>
  `La contraseña temporal de ${nombre} ya no se puede mostrar. Pasaron más de dos minutos o ya se anotó. Si no la recibió, restablezca su contraseña: se genera una clave nueva y se muestra en esta misma pantalla.`;
