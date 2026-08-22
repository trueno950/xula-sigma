import { FormularioDeAltaDePersona } from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Ruta fina: compone el formulario. `(panel)/layout.tsx` ya exige sesion;
 * aca solo se decide si el rol alcanza, para no mostrar un formulario que
 * la Server Action va a rechazar igual — misma regla, `puedeEscribir`, que
 * corre otra vez dentro de `altaDePersona` porque ocultar un boton no es
 * autorizacion (`05-seguridad.md` seccion 6).
 */
export default async function PaginaDeAltaDePersona({ searchParams }: Props) {
  const contexto = await contextoActual();
  const { error } = await searchParams;

  if (!contexto || !puedeEscribir(contexto.usuario.rol)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Su rol no tiene permiso para dar de alta personas.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        Nueva persona
      </h1>
      <FormularioDeAltaDePersona {...(error ? { error } : {})} />
    </main>
  );
}
