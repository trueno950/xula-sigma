import { notFound } from "next/navigation";
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
import {
  Aviso,
  CLASES_DE_ETIQUETA,
  PaginaDePanel,
  Panel,
  PantallaDeMensaje,
} from "@/shared/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

const Dato = ({
  etiqueta,
  valor,
  dato,
}: {
  etiqueta: string;
  valor: string;
  dato?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <dt className={CLASES_DE_ETIQUETA}>{etiqueta}</dt>
    <dd className={`text-[15px] text-caliza-tinta${dato ? " font-mono" : ""}`}>
      {valor}
    </dd>
  </div>
);

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
 *
 * Reimprimir y cancelar van cada una en su propio panel y no en una hilera
 * de botones: las dos piden un motivo antes de ejecutar, asi que son
 * formularios, y un formulario suelto al pie de una ficha se lee como parte
 * de la ficha.
 */
export default async function PaginaDeDetalleDeConstancia({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const { id } = await params;
  const analisisDeId = esquemaDeId.safeParse(id);
  const constancia = analisisDeId.success
    ? await constanciaPorId(comoConstanciaId(analisisDeId.data), contexto)
    : null;

  // Regla 8, igual que en la ficha de una persona.
  if (!constancia) notFound();

  const datos = esquemaDeSnapshot.parse(constancia.datos);
  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const cancelada = constancia.canceladaEn !== null;

  return (
    <PaginaDePanel
      titulo={constancia.folio}
      ancho="detalle"
      accion={<BotonDeImprimir id={constancia.id} />}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {cancelada ? (
        <Aviso tono="error">
          {`Documento cancelado: ${constancia.motivoCancelacion}`}
        </Aviso>
      ) : null}

      <dl className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
        <Dato etiqueta="Titular" valor={datos.titular.nombreCompleto} />
        <Dato etiqueta="Direccion" valor={datos.direccion.texto} />
        <Dato etiqueta="Reside desde" valor={datos.direccion.desdeEn} dato />
        <Dato
          etiqueta="Emitida"
          valor={fechaYHoraEnMerida(constancia.emitidaEn)}
          dato
        />
      </dl>

      {!cancelada && puedeEscribir(contexto.usuario.rol) ? (
        <Panel titulo="Reimprimir">
          <BotonDeReimpresion constanciaId={constancia.id} />
        </Panel>
      ) : null}

      {!cancelada && puedeAdministrarDocumentos(contexto.usuario.rol) ? (
        <Panel titulo="Cancelar">
          <BotonDeCancelacion constanciaId={constancia.id} />
        </Panel>
      ) : null}
    </PaginaDePanel>
  );
}
