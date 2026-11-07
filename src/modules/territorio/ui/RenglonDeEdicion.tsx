import { CaretRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import type { EstadoDeAccion } from "./bloqueosDeLugar";
import type { ClaveDeEdicion } from "./estadosDeEdicion";

export type ItemDeEdicion = {
  clave: ClaveDeEdicion;
  etiqueta: string;
  descripcion: string;
  Icono: ComponentType<{ size?: number; className?: string }>;
  destructiva?: boolean;
};

type Props = {
  item: ItemDeEdicion;
  estado: EstadoDeAccion;
  href: string;
  actual: boolean;
};

const CLASES_DEL_RENGLON = "flex min-h-11 items-center gap-3 px-3 py-2.5";

/**
 * Un renglon de la pestana Editar. Bloqueado no es enlace: muestra el
 * motivo donde iria la descripcion, para que no haga falta abrir un
 * formulario que el caso de uso ya rechazaria.
 */
export function RenglonDeEdicion({ item, estado, href, actual }: Props) {
  const bloqueada = estado.clase === "bloqueada";
  const tinta = item.destructiva && !bloqueada;
  const contenido = (
    <>
      <item.Icono
        size={20}
        className={tinta ? "text-senial-error" : "text-caliza-apagada"}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={`text-[15px] font-medium ${
            tinta ? "text-senial-error" : "text-caliza-tinta"
          }`}
        >
          {item.etiqueta}
        </span>
        <span className="text-[13px] text-caliza-apagada">
          {bloqueada ? estado.motivo : item.descripcion}
        </span>
      </span>
    </>
  );

  return (
    <li className="border-b border-caliza-divisor">
      {bloqueada ? (
        <div className={CLASES_DEL_RENGLON}>{contenido}</div>
      ) : (
        <Link
          href={href}
          aria-current={actual ? "true" : undefined}
          aria-label={`${item.etiqueta}. ${item.descripcion}`}
          className={`${CLASES_DEL_RENGLON} transition-colors hover:bg-caliza-superficie focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-marca`}
        >
          {contenido}
          <CaretRight
            size={16}
            className="ml-auto shrink-0 text-caliza-apagada"
          />
        </Link>
      )}
    </li>
  );
}
