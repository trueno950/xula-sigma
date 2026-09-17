import { CaretDown, CaretUp } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  CLASES_DE_DATO,
  CLASES_DE_ETIQUETA,
  clasesDeBoton,
  plantillaDeColumnas,
} from "./estilos";

export type ColumnaDeTabla = {
  clave: string;
  etiqueta: string;
  /** Fraccion de la fila en escritorio. `minmax(0,...)` evita el desborde. */
  ancho?: string;
  /**
   * Presente solo en columnas con orden natural (`design.md`, "Ordenamiento
   * de columnas"). Quien compone la pantalla ya resolvio `href` y `activa`
   * -con `@tanstack/table-core` corriendo del lado del servidor-; `Tabla`
   * solo decide si pintar un link o un texto quieto.
   */
  orden?: {
    href: string;
    activa: false | "asc" | "desc";
  };
};

type PropsDeTabla = {
  /** Lo que la lista es, para el lector de pantalla. */
  etiqueta: string;
  columnas: readonly ColumnaDeTabla[];
  children: ReactNode;
  /**
   * El link "Ver mas" de `design.md`, "Paginacion". Ausente cuando la
   * respuesta trajo menos filas que el tamano de pagina -no hay una pagina
   * vacia a la que llegar.
   */
  verMas?: string;
};

const ETIQUETA_DE_DIRECCION: Record<"asc" | "desc", string> = {
  asc: "ascendente",
  desc: "descendente",
};

/**
 * La tabla de `DESIGN.md`: encabezado pegajoso de 36px, filas de 44px,
 * divisor de 1px, sin cebra, sin scroll horizontal.
 *
 * **No es un `<table>`, es una lista de enlaces.** Cada fila entra a una
 * pantalla; el marcado que describe eso es `ul`/`li`/`a`, y el que lo
 * anuncia bien es ese. Un `role="row"` sobre un `<a>` le quita al enlace su
 * propia semantica, que es la que el operador usa para navegar.
 *
 * Por eso las columnas sin orden llevan `aria-hidden`: son una guia visual
 * y nada mas, y lo que el lector de pantalla necesita saber de cada celda
 * va en el texto del enlace de fila, que se lee entero. Una columna
 * ordenable (`columna.orden`) es la excepcion: ahi el encabezado deja de
 * ser decorativo -es un link real que reordena la lista-, asi que pierde el
 * `aria-hidden` y gana un `aria-label` con la direccion activa, porque el
 * peso visual del icono solo no alcanza (`DESIGN.md`, "todo estado lleva
 * texto o icono").
 *
 * El encabezado se esconde por debajo de 640px porque abajo de ese ancho no
 * hay columnas que encabezar: la fila se reordena en dos renglones
 * (identificador arriba, datos de apoyo abajo). Dos formas reales, no una
 * forma con barra de scroll.
 *
 * Se pega debajo de lo que ya esta pegado arriba, que cambia con el ancho:
 * la barra de identidad mide 64px siempre, y por debajo de 768px se le suma
 * la fila de modulos de 48px. Con `top-0` el encabezado de la tabla se
 * metia debajo de las dos al hacer scroll.
 */
export function Tabla({ etiqueta, columnas, children, verMas }: PropsDeTabla) {
  const plantilla = plantillaDeColumnas(columnas);

  return (
    <div
      className="flex flex-col"
      style={{ "--columnas-de-tabla": plantilla } as CSSProperties}
    >
      <div className="sticky top-28 z-[5] hidden md:top-16 h-9 items-center gap-4 border-b border-caliza-divisor bg-caliza-superficie px-3 sm:grid sm:[grid-template-columns:var(--columnas-de-tabla)]">
        {columnas.map((columna) =>
          columna.orden ? (
            <Link
              key={columna.clave}
              href={columna.orden.href}
              className={`inline-flex items-center gap-1 ${CLASES_DE_ETIQUETA} hover:text-caliza-tinta`}
              aria-label={`${columna.etiqueta}, ${
                columna.orden.activa
                  ? `ordenado ${ETIQUETA_DE_DIRECCION[columna.orden.activa]}`
                  : "sin ordenar"
              }`}
            >
              {columna.etiqueta}
              {columna.orden.activa === "asc" ? (
                <CaretUp size={12} weight="bold" aria-hidden="true" />
              ) : columna.orden.activa === "desc" ? (
                <CaretDown size={12} weight="bold" aria-hidden="true" />
              ) : null}
            </Link>
          ) : (
            <span
              key={columna.clave}
              aria-hidden="true"
              className={CLASES_DE_ETIQUETA}
            >
              {columna.etiqueta}
            </span>
          ),
        )}
      </div>
      <ul aria-label={etiqueta} className="flex flex-col">
        {children}
      </ul>
      {verMas ? (
        <div className="flex justify-center border-t border-caliza-divisor py-3">
          <Link href={verMas} className={clasesDeBoton("secundaria")}>
            Ver mas
          </Link>
        </div>
      ) : null}
    </div>
  );
}

type PropsDeFila = {
  /**
   * A donde entra la fila. **Opcional**: no todo lo que se lista tiene
   * pantalla propia. Una calle y un domicilio se leen en la tabla y no
   * llevan a ningun lado, y pintarles hover y cursor de enlace prometia un
   * clic que no pasaba nada.
   */
  href?: string;
  /** El nombre completo de la fila: las celdas van pegadas sin esto. */
  etiquetaAccesible?: string;
  children: ReactNode;
};

const DISPOSICION_DE_FILA =
  "flex min-h-11 flex-col justify-center gap-0.5 px-3 py-2 sm:grid sm:h-11 sm:items-center sm:gap-4 sm:py-0 sm:[grid-template-columns:var(--columnas-de-tabla)]";

/**
 * Una fila. Cuando lleva `href`, el hover a caliza-superficie es la unica
 * retroalimentacion de que es accionable, y por eso el enlace ocupa la fila
 * entera: un enlace del ancho del texto deja la mitad de la fila muerta al
 * clic. Sin `href` no hay hover ni foco, porque no hay nada que hacer.
 */
export function FilaDeTabla({
  href,
  etiquetaAccesible,
  children,
}: PropsDeFila) {
  return (
    <li className="border-b border-caliza-divisor">
      {href ? (
        <Link
          href={href}
          aria-label={etiquetaAccesible}
          className={`${DISPOSICION_DE_FILA} transition-colors hover:bg-caliza-superficie focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-marca`}
        >
          {children}
        </Link>
      ) : (
        <div className={DISPOSICION_DE_FILA}>{children}</div>
      )}
    </li>
  );
}

/** La celda que identifica la fila: tipografia Title, tinta plena. */
export function CeldaPrincipal({ children }: { children: ReactNode }) {
  return (
    <span className="truncate text-[15px] font-medium text-caliza-tinta">
      {children}
    </span>
  );
}

/** CURP, folio, fecha: tipografia Dato, `tabular-nums`, tono apagado. */
export function CeldaDeDato({ children }: { children: ReactNode }) {
  return <span className={`truncate ${CLASES_DE_DATO}`}>{children}</span>;
}
