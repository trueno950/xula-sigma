import { redirect } from "next/navigation";
import { contextoActual } from "@/shared/auth";
import { leerMarca } from "@/shared/marca";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { FormularioDeAcceso } from "./FormularioDeAcceso";

/**
 * Pantalla de acceso del municipio. Server Component.
 *
 * El nombre y el escudo salen de la base **antes de que exista sesion** —
 * es para lo que la politica `ayuntamientos_directorio_publico` deja leer
 * esta tabla sin tenant fijado. Lo unico publico de un municipio es lo que
 * esta en la fachada del palacio.
 *
 * Solo el formulario es `"use client"`, y esta en su propio archivo: la
 * pagina se queda de servidor y lo interactivo baja a la hoja.
 */
export default async function PaginaDeAcceso() {
  // Quien ya tiene sesion no ve la pantalla de acceso. Se verifica en
  // servidor: esconder el formulario en el cliente no es autorizacion.
  if (await contextoActual()) redirect("/");

  const ayuntamiento = await ayuntamientoActual();
  const { escudo } = leerMarca(ayuntamiento.marca);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <header className="flex flex-col items-center gap-3 text-center">
        {escudo ? (
          // biome-ignore lint/performance/noImgElement: el escudo sale de R2
          // con dominio por municipio; `next/image` pediria declararlos todos
          // en la configuracion de build, y son datos, no configuracion.
          <img
            src={escudo}
            alt={`Escudo de ${ayuntamiento.nombre}`}
            className="h-20 w-20 object-contain"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {ayuntamiento.nombre}
          </h1>
          <p className="text-sm text-neutral-600">XULA SIGMA</p>
        </div>
      </header>

      <FormularioDeAcceso />

      <p className="text-center text-xs text-neutral-500">
        Si no tiene cuenta, pidasela a quien administra el sistema en su
        ayuntamiento.
      </p>
    </main>
  );
}
