import {
  CheckCircle,
  CircleDashed,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react/ssr";

export type TonoDeInsignia = "neutro" | "exito" | "aviso" | "error";

const PRESENTACION: Record<
  TonoDeInsignia,
  { Icono: typeof CheckCircle; clases: string }
> = {
  neutro: {
    Icono: CircleDashed,
    clases: "bg-caliza-relleno text-caliza-tinta",
  },
  exito: {
    Icono: CheckCircle,
    clases: "bg-senial-exito-suave text-senial-exito",
  },
  aviso: {
    Icono: WarningCircle,
    clases: "bg-senial-aviso-suave text-senial-aviso",
  },
  error: { Icono: XCircle, clases: "bg-senial-error-suave text-senial-error" },
};

type Props = {
  tono: TonoDeInsignia;
  /** La palabra del estado, ya en español: la insignia no la traduce. */
  etiqueta: string;
};

/**
 * La insignia de estado de `DESIGN.md`: pastilla de 24px con icono de 14px y
 * la palabra en Label. **Siempre icono y palabra**: la marca por defecto y el
 * error comparten tono, asi que el color solo nunca alcanza.
 *
 * El tono lo decide quien compone la pantalla; este componente no conoce
 * estados de dominio. El icono es decorativo y la palabra es el nombre
 * accesible.
 */
export function InsigniaDeEstado({ tono, etiqueta }: Props) {
  const { Icono, clases } = PRESENTACION[tono];

  return (
    <span
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 text-[13px] font-medium leading-none ${clases}`}
    >
      <Icono size={14} weight="bold" aria-hidden="true" />
      {etiqueta}
    </span>
  );
}
