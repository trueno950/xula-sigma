import { ArrowsClockwise, Prohibit } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
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
  AvisoDePermiso,
  CLASES_DE_ETIQUETA,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { AccionColegable } from "./AccionColegable";

export const metadata: Metadata = { title: "Constancia" };

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
 * 10 y 11): imprimir (`BotonDeImprimir`, ausente si esta cancelada: el PDF
 * sigue siendo descargable por su URL pero marcado, no se ofrece como hoja
 * para entregar), reimprimir con motivo
 * (`BotonDeReimpresion`, gateado por `puedeEscribir`) y cancelar con motivo
 * (`BotonDeCancelacion`, gateado por `puedeAdministrarDocumentos`) -en los
 * dos casos ocultar el boton no es la autorizacion real, que vive en
 * `reimprimirConstancia`/`cancelarConstancia`; el gate aca es solo para no
 * mostrar una accion que el caso de uso va a rechazar (hallazgo de GGA: el
 * gate de `BotonDeReimpresion` faltaba, el comentario decia que existia)-.
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe": RLS ya deja
 * `constanciaPorId` en `null` para una constancia de otro tenant, y la
 * pantalla responde 404 sin distinguirla de una inexistente.
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
  const puedeReimprimir = puedeEscribir(contexto.usuario.rol);
  const puedeCancelar = puedeAdministrarDocumentos(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo={constancia.folio}
      ancho="detalle"
      accion={cancelada ? undefined : <BotonDeImprimir id={constancia.id} />}
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Constancias", href: "/constancias" },
            { etiqueta: constancia.folio },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {cancelada ? (
        <Aviso tono="error">
          {`Documento cancelado: ${constancia.motivoCancelacion}`}
        </Aviso>
      ) : null}
      {!cancelada && !puedeReimprimir ? (
        <AvisoDePermiso
          capacidad="reimprimir esta constancia"
          requisito="un rol con permisos de escritura"
        />
      ) : null}
      {!cancelada && !puedeCancelar ? (
        <AvisoDePermiso
          capacidad="cancelar esta constancia"
          requisito="el rol de administrador municipal"
        />
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
      {!cancelada && puedeReimprimir ? (
        <AccionColegable titulo="Reimprimir constancia" Icono={ArrowsClockwise}>
          <BotonDeReimpresion constanciaId={constancia.id} />
        </AccionColegable>
      ) : null}

      {!cancelada && puedeCancelar ? (
        <AccionColegable titulo="Cancelar constancia" Icono={Prohibit}>
          <BotonDeCancelacion constanciaId={constancia.id} />
        </AccionColegable>
      ) : null}
    </PaginaDePanel>
  );
}
