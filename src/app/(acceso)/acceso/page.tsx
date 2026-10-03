import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contextoActual } from "@/shared/auth";
import { leerMarca } from "@/shared/marca";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { FormularioDeAcceso } from "./FormularioDeAcceso";
import { PanelDeBienvenida } from "./PanelDeBienvenida";

export const metadata: Metadata = { title: "Acceso" };

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
    <main className="grid min-h-dvh min-[960px]:grid-cols-2">
      <PanelDeBienvenida nombre={ayuntamiento.nombre} escudo={escudo} />

      <div className="flex flex-col items-center justify-center gap-4 px-4 py-8 min-[960px]:px-8">
        <section className="flex w-full max-w-[400px] flex-col gap-6 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-6 text-caliza-tinta shadow-reposo">
          <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em]">
            Entrar
          </h2>
          <FormularioDeAcceso />
        </section>
        <p className="max-w-[400px] text-center text-[13px] text-caliza-apagada">
          Si no tiene cuenta, pídasela a quien administra el sistema en su
          ayuntamiento.
        </p>
      </div>
    </main>
  );
}
