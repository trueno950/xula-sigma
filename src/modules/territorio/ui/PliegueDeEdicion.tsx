import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { ClaveDeEdicion } from "./estadosDeEdicion";

export type ItemDeEdicion = {
  clave: ClaveDeEdicion;
  /** Lo que dice el `<summary>`, con los puntos suspensivos del pliegue. */
  etiqueta: string;
  destructiva?: boolean;
};

/**
 * Las tres acciones del lugar, en el orden en que se leen: primero
 * corregir el nombre, despues colgarlo de otro lado, y al final lo que no
 * se deshace. «Dar de baja» va ultima y en rojo por eso mismo -nunca al lado
 * del paso siguiente-, mismo criterio que `AdministrarPersona` y
 * `AccionesDeConstancia`.
 */
export const ACCIONES_DE_LUGAR: readonly ItemDeEdicion[] = [
  { clave: "renombrar", etiqueta: "Renombrar…" },
  { clave: "reparentear", etiqueta: "Mover a otro asentamiento…" },
  { clave: "baja", etiqueta: "Dar de baja…", destructiva: true },
];

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border bg-caliza-lienzo px-3.5 py-2.5 text-left text-[15px] font-semibold " +
  "transition-colors duration-150 ease-salida [&::-webkit-details-marker]:hidden";

type Props = {
  item: ItemDeEdicion;
  /** Si la URL o el caso de uso ya eligieron esta accion. */
  abierto: boolean;
  children: ReactNode;
};

/**
 * Un pliegue de la cabecera del lugar: la accion y, adentro, su formulario
 * nativo. `<details>` abre sin JavaScript y el `name` compartido lo vuelve
 * acordeon -abrir uno cierra el otro-, como en `AdministrarPersona`.
 *
 * `abierto` no es estado de cliente: viene de `?accion=` (`parametros.ts`),
 * asi que un enlace guardado a `…&accion=baja` sigue abriendo donde abria
 * cuando «Editar» era una pestana.
 */
export function PliegueDeEdicion({ item, abierto, children }: Props) {
  const color = item.destructiva
    ? "border-senial-error text-senial-error hover:bg-senial-error-suave"
    : "border-caliza-borde text-caliza-tinta hover:bg-caliza-superficie";

  return (
    <details
      name="acciones-de-lugar"
      open={abierto}
      className="group sm:open:basis-full"
    >
      <summary className={`${CLASES_DE_SUMMARY} ${color}`}>
        {item.etiqueta}
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden="true"
          className="ml-auto shrink-0 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 flex flex-col gap-4 rounded-md bg-caliza-superficie p-3.5">
        {children}
      </div>
    </details>
  );
}
