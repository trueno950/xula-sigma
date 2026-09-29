import type { Metadata } from "next";
import { FormularioDeEscudo } from "@/modules/marca";
import { contextoActual } from "@/shared/auth";
import { puedeCambiarMarca } from "@/shared/auth/roles";

export const metadata: Metadata = { title: "Marca" };

/**
 * Ruta fina: compone el formulario. `(panel)/layout.tsx` ya exige sesion;
 * aca solo se decide si el rol alcanza, para no mostrar un formulario que
 * la Server Action va a rechazar igual — misma regla, `puedeCambiarMarca`,
 * que corre otra vez dentro de `cambiarEscudo` porque ocultar un boton no
 * es autorizacion (`05-seguridad.md` seccion 6).
 */
export default async function PaginaDeMarca() {
  const contexto = await contextoActual();

  if (!contexto || !puedeCambiarMarca(contexto.usuario.rol)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-sm text-neutral-700">
          Su rol no tiene permiso para cambiar la marca del ayuntamiento.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <h1 className="text-xl font-semibold text-neutral-900">
        Escudo del ayuntamiento
      </h1>
      <FormularioDeEscudo />
    </main>
  );
}
