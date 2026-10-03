import { CaretRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ANILLO_DE_FOCO } from "./estilos";

type Icono = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

type Props = {
  /** El `name` compartido: los detalles de un mismo grupo se cierran entre si. */
  grupo: string;
  etiqueta: string;
  Icono: Icono;
  abierto: boolean;
  destructiva?: boolean;
  children: ReactNode;
};

const FILA =
  "flex min-h-11 w-fit max-w-full items-center gap-2 rounded-md px-3 text-left text-[15px] font-medium transition-colors duration-150 ease-salida";

const claseDeFila = (destructiva: boolean) =>
  `${FILA} ${ANILLO_DE_FOCO} ${
    destructiva
      ? "text-senial-error hover:bg-senial-error-suave"
      : "text-caliza-tinta hover:bg-caliza-superficie"
  }`;

/**
 * Una accion de un panel de detalle: `<details>` nativo con `name`
 * compartido, asi que abrir una cierra las otras sin estado de cliente. El
 * giro de la flecha es instantaneo (`DESIGN.md`, "Divulgacion progresiva").
 */
export function ItemDeAccion({
  grupo,
  etiqueta,
  Icono,
  abierto,
  destructiva = false,
  children,
}: Props) {
  return (
    <details name={grupo} open={abierto} className="group/accion">
      <summary
        className={`${claseDeFila(destructiva)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        <Icono size={18} aria-hidden />
        <span>{etiqueta}</span>
        <CaretRight
          size={14}
          weight="bold"
          aria-hidden="true"
          className="group-open/accion:rotate-90"
        />
      </summary>
      <div className="flex flex-col gap-4 px-3 pb-4 pt-3">{children}</div>
    </details>
  );
}

/** El mismo renglon que un detalle, pero que navega. */
export function EnlaceDeItemDeAccion({
  etiqueta,
  Icono,
  href,
}: {
  etiqueta: string;
  Icono: Icono;
  href: string;
}) {
  return (
    <Link href={href} className={claseDeFila(false)}>
      <Icono size={18} aria-hidden />
      <span>{etiqueta}</span>
      <CaretRight size={14} weight="bold" aria-hidden="true" />
    </Link>
  );
}
