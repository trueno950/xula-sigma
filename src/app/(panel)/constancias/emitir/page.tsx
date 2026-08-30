import Link from "next/link";
import { z } from "zod";
import { FormularioDeEmision } from "@/modules/constancias";
import { comoPersonaId, personaPorId } from "@/modules/padron";
import { direccionVigenteDePersona } from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({
  personaId: z.string().uuid().optional(),
  error: z.string().optional(),
});

/**
 * `personaId` llega por `?personaId=`, no por un segmento dinamico: el
 * texto literal de tasks.md 4.24 fija exactamente tres rutas,
 * `{page,emitir,[id]}`, y `[id]` ahi es la constancia, no la persona. La
 * unica pantalla del repo que ya tiene un `personaId` en mano es
 * `/padron/[id]`, que enlaza aca con el parametro puesto.
 */
export default async function PaginaDeEmisionDeConstancia({
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

  if (!puedeEscribir(contexto.usuario.rol)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Su rol no tiene permiso para emitir constancias.
        </p>
      </main>
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const personaId = analisis.success ? analisis.data.personaId : undefined;
  const error = analisis.success ? analisis.data.error : undefined;

  if (!personaId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Elija una persona desde el padron para emitir su constancia.
        </p>
        <Link href="/padron" className="text-[15px] text-marca">
          Ir al padron
        </Link>
      </main>
    );
  }

  const persona = await personaPorId(comoPersonaId(personaId), contexto);

  if (!persona) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Esa persona no existe.
        </p>
      </main>
    );
  }

  const direccion = await direccionVigenteDePersona(personaId, contexto);
  const nombreCompleto = [
    persona.nombres,
    persona.primerApellido,
    persona.segundoApellido,
  ]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        Emitir constancia
      </h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      <FormularioDeEmision
        personaId={personaId}
        nombreCompleto={nombreCompleto}
        direccion={
          direccion
            ? { texto: direccion.texto, desdeEn: direccion.desdeEn }
            : null
        }
      />
    </main>
  );
}
