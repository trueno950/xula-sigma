import { z } from "zod";
import {
  BotonDeCancelacion,
  BotonDeImprimir,
  BotonDeReimpresion,
  comoConstanciaId,
  constanciaPorId,
  esquemaDeSnapshot,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos, puedeEscribir } from "@/shared/auth/roles";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Muestra el snapshot congelado como texto plano, mas los tres bordes de
 * ciclo de vida del documento (design.md de `constancias-oficios`, secciones
 * 10 y 11): imprimir (`BotonDeImprimir`), reimprimir con motivo
 * (`BotonDeReimpresion`, gateado por `puedeEscribir`) y cancelar con motivo
 * (`BotonDeCancelacion`, gateado por `puedeAdministrarDocumentos`) -en los
 * dos casos ocultar el boton no es la autorizacion real, que vive en
 * `reimprimirConstancia`/`cancelarConstancia`; el gate aca es solo para no
 * mostrar una accion que el caso de uso va a rechazar (hallazgo de GGA: el
 * gate de `BotonDeReimpresion` faltaba, el comentario decia que existia)-.
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe" -equivalente,
 * no un 404 real, RLS ya deja `constanciaPorId` en `null` para una
 * constancia de otro tenant.
 *
 * `?error=` efectivamente se lee aca -a diferencia del gap que la revision
 * de la Fase 4b encontro en esta misma pantalla-: las dos acciones nuevas
 * redirigen con ese parametro cuando `reimprimirConstancia` o
 * `cancelarConstancia` rechazan.
 */
export default async function PaginaDeDetalleDeConstancia({
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
  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const cancelada = constancia.canceladaEn !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        {constancia.folio}
      </h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      {cancelada ? (
        <p className="text-[15px] text-senial-error">
          Documento cancelado: {constancia.motivoCancelacion}
        </p>
      ) : null}

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

      <div className="flex flex-wrap gap-3">
        <BotonDeImprimir id={constancia.id} />
        {!cancelada && puedeEscribir(contexto.usuario.rol) ? (
          <BotonDeReimpresion constanciaId={constancia.id} />
        ) : null}
      </div>

      {!cancelada && puedeAdministrarDocumentos(contexto.usuario.rol) ? (
        <BotonDeCancelacion constanciaId={constancia.id} />
      ) : null}
    </main>
  );
}
