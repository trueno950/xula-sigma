import { CheckCircle, XCircle } from "@phosphor-icons/react/ssr";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import {
  type EstadoDeConstancia,
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
  type MotivoDeCancelacion,
} from "../domain";

type Props = {
  estado: EstadoDeConstancia;
  canceladaEn?: Date | null;
  motivoCancelacion?: MotivoDeCancelacion | null;
};

const PRESENTACION = {
  VIGENTE: {
    Icono: CheckCircle,
    clases: "bg-senial-exito-suave text-senial-exito",
  },
  CANCELADA: {
    Icono: XCircle,
    clases: "bg-senial-error-suave text-senial-error",
  },
} as const;

/**
 * S7 de `constancias-ux`, con la decision L6 del usuario: el estado de la
 * constancia se lee **una sola vez**, como el sello sobre la hoja del
 * tablero elegido (`design/constancias-detalle/02-hoja-sellada.html`), y no
 * tambien como insignia junto al folio.
 *
 * La palabra va escrita, no solo el color: el sello se entiende sin
 * distinguir tonos. El giro de tres grados es lo que lo lee como marca
 * puesta sobre el papel y no como un dato de sistema; no anima nada, asi que
 * `prefers-reduced-motion` no tiene que apagarlo.
 *
 * En una hoja cancelada la fecha y el motivo acompanan al sello: el
 * documento tiene que explicarse solo, y el motivo se muestra con su
 * etiqueta -el codigo del catalogo cerrado no le dice nada a la operadora-.
 */
export function SelloDeConstancia({
  estado,
  canceladaEn = null,
  motivoCancelacion = null,
}: Props) {
  const { Icono, clases } = PRESENTACION[estado];

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        className={`inline-flex -rotate-3 items-center gap-2 rounded-sm border-2 px-3.5 py-2.5 text-[15px] leading-tight font-[650] tracking-[0.02em] ${clases}`}
      >
        <Icono size={18} weight="bold" aria-hidden="true" />
        {ETIQUETA_DE_ESTADO_DE_CONSTANCIA[estado]}
      </span>
      {estado === "CANCELADA" && canceladaEn ? (
        <p className="text-[13px] leading-snug text-caliza-apagada">
          Cancelada el {fechaYHoraEnMerida(canceladaEn)}
          {motivoCancelacion
            ? ` · Motivo: ${ETIQUETA_DE_MOTIVO_DE_CANCELACION[motivoCancelacion]}`
            : null}
        </p>
      ) : null}
    </div>
  );
}
