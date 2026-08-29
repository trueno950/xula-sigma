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
const esquemaDeId = z.string().uuid();

/**
 * Unica ruta que compone `padron` y `territorio` (design.md seccion 11,
 * "Composicion de pantallas"). La dependencia entre modulos es de un solo
 * sentido: `territorio/infrastructure/lectorDePersonasPorPadron.ts` importa
 * el barrel de `padron` (puerto propio + adaptador, design.md seccion 6),
 * pero `padron` nunca importa `territorio` -esa arista no existe, y es lo
 * que `sin-ciclos` en `.dependency-cruiser.cjs` hace cumplir-. Esta pagina
 * no repite esa arista: solo necesita leer de los dos barrels para
 * mostrarlos juntos, algo que ningun modulo podria hacer sin crear una
 * dependencia permanente entre ellos.
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

  /**
   * El formato se valida con Zod, no con un `try/catch` alrededor de
   * `personaPorId` (hallazgo de GGA en la revision de esta rebanada): un
   * `catch` amplio ahi tragaria tambien un fallo real de infraestructura
   * -conexion caida, timeout- y lo mostraria igual que un id inexistente,
   * sin log y sin propagar el error. Con la validacion aparte, un fallo de
   * `personaPorId` que no sea "no encontrado" sigue siendo un error real.
   */
  const analisisDeId = esquemaDeId.safeParse(id);
  const persona = analisisDeId.success
    ? await personaPorId(comoPersonaId(analisisDeId.data), contexto)
    : null;

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
