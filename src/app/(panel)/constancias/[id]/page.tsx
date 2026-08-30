import { z } from "zod";
import {
  BotonDeImprimir,
  comoConstanciaId,
  constanciaPorId,
  esquemaDeSnapshot,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";

type Props = {
  params: Promise<{ id: string }>;
};

const esquemaDeId = z.string().uuid();

/**
 * Muestra el snapshot congelado como texto plano, mas el enlace de
 * impresion (`BotonDeImprimir`, design.md de `constancias-oficios`, seccion
 * 11). Mismo criterio que `padron/[id]/page.tsx` para "no existe"
 * -equivalente, no un 404 real, RLS ya deja `constanciaPorId` en `null`
 * para una constancia de otro tenant.
 */
export default async function PaginaDeDetalleDeConstancia({ params }: Props) {
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
  const analisisDeId = esquemaDeId.safeParse(id);
  const constancia = analisisDeId.success
    ? await constanciaPorId(comoConstanciaId(analisisDeId.data), contexto)
    : null;

  if (!constancia) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Esa constancia no existe.
        </p>
      </main>
    );
  }

  const datos = esquemaDeSnapshot.parse(constancia.datos);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        {constancia.folio}
      </h1>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-[13px] font-medium text-caliza-apagada">
            Titular
          </dt>
          <dd className="text-[15px] text-caliza-tinta">
            {datos.titular.nombreCompleto}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-caliza-apagada">
            Direccion
          </dt>
          <dd className="text-[15px] text-caliza-tinta">
            {datos.direccion.texto}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-caliza-apagada">
            Reside desde
          </dt>
          <dd className="text-[15px] text-caliza-tinta">
            {datos.direccion.desdeEn}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-caliza-apagada">
            Emitida
          </dt>
          <dd className="text-[15px] text-caliza-tinta">
            {fechaYHoraEnMerida(constancia.emitidaEn)}
          </dd>
        </div>
      </dl>

      <BotonDeImprimir id={constancia.id} />
    </main>
  );
}
