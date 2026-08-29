import { z } from "zod";
import { comoPersonaId, personaPorId } from "@/modules/padron";
import {
  FormularioDeMudanza,
  HistorialDeResidencias,
  historialDeResidencias,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Unica ruta que compone `padron` y `territorio` (design.md seccion 11,
 * "Composicion de pantallas"): el historial de residencias de una persona
 * necesita los dos, y ninguno de los dos modulos puede importar al otro
 * (`sin-ciclos` en `.dependency-cruiser.cjs`). `src/app` es la unica capa
 * que conoce a ambos.
 */
export default async function PaginaDeDetalleDePersona({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          No se pudo determinar su sesion.
        </p>
      </main>
    );
  }

  const { id } = await params;
  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;

  let persona: Awaited<ReturnType<typeof personaPorId>> = null;
  try {
    persona = await personaPorId(comoPersonaId(id), contexto);
  } catch {
    // `id` con formato invalido: mismo tratamiento que un id inexistente,
    // nunca un 500 sobre una URL manipulada a mano.
    persona = null;
  }

  if (!persona) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Esa persona no existe.
        </p>
      </main>
    );
  }

  const historial = await historialDeResidencias(persona.id, contexto);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        {persona.nombres} {persona.primerApellido}
        {persona.segundoApellido ? ` ${persona.segundoApellido}` : ""}
      </h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-medium text-caliza-tinta">
          Historial de residencias
        </h2>
        <HistorialDeResidencias historial={historial} />
      </section>

      {puedeEscribir(contexto.usuario.rol) ? (
        <div className="border-t border-caliza-divisor pt-4">
          <FormularioDeMudanza personaId={persona.id} />
        </div>
      ) : null}
    </main>
  );
}
