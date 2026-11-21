import { WarningCircle } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cambiarContraseniaPropiaAction } from "@/modules/usuarios/ui/actions/cambiarContraseniaPropiaAction";
import { mensajeDeCambioDeClave } from "@/modules/usuarios/ui/mensajesDeCambioDeClave";
import { contextoActual, contextoDeCambioDeClave } from "@/shared/auth";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";
import { Aviso, Boton, Campo } from "@/shared/ui";

export const metadata: Metadata = { title: "Cambiar contraseña" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * S2: la pantalla del cambio obligatorio. Es la unica que una sesion abierta
 * con una contrasenia temporal puede abrir, porque `contextoActual()` —que
 * es lo que piden todas las paginas, Server Actions y Route Handlers del
 * panel— devuelve `null` mientras la marca siga puesta.
 *
 * **Vive en `(acceso)` y no en `(panel)`**, y es a proposito: el layout del
 * panel manda aca a quien trae la temporal, asi que colgarla de ese grupo
 * seria un redirect a si mismo. Ademas `(acceso)` es exactamente el grupo de
 * las pantallas sin sesion hecha: aca no hay navegacion de modulos que
 * ofrecer, porque ninguna otra pantalla se puede abrir todavia.
 *
 * El `<form>` es nativo y lo sirve una Server Action, sin JavaScript de por
 * medio (misma eleccion que el alta de usuarios). El error viaja como codigo
 * en `?error=` y el mensaje lo pone `mensajesDeCambioDeClave.ts`: la clave no
 * aparece nunca en la URL ni en el log.
 */
export default async function PaginaDeCambioDeClave({ searchParams }: Props) {
  const contexto = await contextoDeCambioDeClave();

  if (!contexto) {
    // Quien ya tiene clave propia no tiene nada que hacer aca.
    if (await contextoActual()) redirect("/");

    redirect("/acceso");
  }

  const parametros = await searchParams;
  const error = mensajeDeCambioDeClave(parametros.error);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-8">
      <section className="flex w-full max-w-[440px] flex-col gap-6 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-6 text-caliza-tinta shadow-reposo">
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em]">
            Cambiar contraseña
          </h1>
          <p className="text-[13px] text-caliza-apagada">
            Entró con una contraseña temporal. Elija la suya para empezar a usar
            el panel; desde ese momento la temporal deja de servir.
          </p>
        </div>

        <form
          action={cambiarContraseniaPropiaAction}
          className="flex flex-col gap-4"
        >
          <Campo
            id="nueva"
            name="nueva"
            etiqueta="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            ayuda={`Al menos ${LARGO_MINIMO} caracteres, distinta de la temporal.`}
          />
          <Campo
            id="repetida"
            name="repetida"
            etiqueta="Repita la contraseña nueva"
            type="password"
            autoComplete="new-password"
          />

          {error ? <Aviso tono="error">{error}</Aviso> : null}

          <div className="[&_button]:w-full">
            <Boton type="submit" variante="primaria">
              <WarningCircle aria-hidden size={16} />
              Cambiar contraseña
            </Boton>
          </div>
        </form>
      </section>
    </main>
  );
}
