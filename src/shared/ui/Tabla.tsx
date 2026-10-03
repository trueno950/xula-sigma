import { CaretDown, CaretRight, CaretUp } from "@phosphor-icons/react/ssr";
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

/** La ultima pista es la del chevron: alinea encabezado y filas. */
const PLANTILLA_DE_FILA =
  "sm:[grid-template-columns:var(--columnas-de-tabla)_1rem]";

const ETIQUETA_DE_DIRECCION: Record<"asc" | "desc", string> = {
  asc: "ascendente",
  desc: "descendente",
};

function FlechaDeOrden({ direccion }: { direccion: "asc" | "desc" }) {
  const Flecha = direccion === "asc" ? CaretUp : CaretDown;
  return (
    <Flecha size={12} weight="bold" aria-hidden="true" data-orden-flecha />
  );
}

/**
 * La tabla de `DESIGN.md`: tarjeta con encabezado pegajoso de 40px, filas de
 * 48px, divisor de 1px, sin cebra, sin scroll horizontal.
 *
 * Recorta con `overflow-clip` y no `overflow-hidden`: este ultimo crea un
 * contenedor de scroll y el encabezado dejaria de pegarse a la ventana.
 * El `top-0` es porque el shell ya no tiene barra superior pegada.
 *
 * **No es un `<table>`, es una lista de enlaces**: cada fila entra a una
 * pantalla, y un `role="row"` sobre un `<a>` le quita su semantica. Por eso
 * las columnas sin orden llevan `aria-hidden` (guia visual; el enlace de
 * fila se lee entero). Una columna ordenable es un link real, asi que gana
 * un `aria-label` con la direccion: el icono solo no alcanza (`DESIGN.md`,
 * "todo estado lleva texto o icono").
 *
 * El encabezado se esconde por debajo de 640px: ahi la fila se reordena en
 * dos renglones (identificador arriba, apoyo abajo), no hay barra de scroll.
 */
export function Tabla({ etiqueta, columnas, children, verMas }: PropsDeTabla) {
  const plantilla = plantillaDeColumnas(columnas);

  return (
    <div
      className="flex flex-col overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo"
      style={{ "--columnas-de-tabla": plantilla } as CSSProperties}
    >
      <div
        className={`sticky top-0 z-[5] hidden h-10 items-center gap-4 border-b border-caliza-divisor bg-caliza-superficie px-4 sm:grid ${PLANTILLA_DE_FILA}`}
      >
        {columnas.map((columna) =>
          columna.orden ? (
            <Link
              key={columna.clave}
              href={columna.orden.href}
              className={`inline-flex items-center gap-1 transition-colors duration-150 ease-salida ${CLASES_DE_ETIQUETA} hover:text-caliza-tinta`}
              aria-label={`${columna.etiqueta}, ${
                columna.orden.activa
                  ? `ordenado ${ETIQUETA_DE_DIRECCION[columna.orden.activa]}`
                  : "sin ordenar"
              }`}
            >
              {columna.etiqueta}
              {columna.orden.activa ? (
                <FlechaDeOrden direccion={columna.orden.activa} />
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
        <div className="flex justify-center border-t border-caliza-divisor py-4">
          <Link href={verMas} className={clasesDeBoton("secundaria")}>
            Ver más
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

const DISPOSICION_DE_FILA = `relative flex min-h-14 flex-col justify-center gap-0.5 px-4 py-2 sm:grid sm:h-12 sm:min-h-0 sm:items-center sm:gap-4 sm:py-0 ${PLANTILLA_DE_FILA}`;

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
    <li className="border-b border-caliza-divisor last:border-b-0">
      {href ? (
        <Link
          href={href}
          aria-label={etiquetaAccesible}
          className={`group pr-10 sm:pr-4 ${DISPOSICION_DE_FILA} transition-colors duration-150 ease-salida hover:bg-caliza-superficie focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-marca`}
        >
          {children}
          <CaretRight
            size={16}
            weight="bold"
            aria-hidden="true"
            data-chevron
            className="absolute right-4 top-1/2 -translate-y-1/2 text-caliza-apagada transition-colors duration-150 ease-salida sm:static sm:translate-y-0 sm:text-transparent sm:group-hover:text-caliza-apagada sm:group-focus-visible:text-caliza-apagada"
          />
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
    <span className="truncate text-[15px] font-semibold text-caliza-tinta">
      {children}
    </span>
  );
}

/** CURP, folio, fecha: tipografia Dato, `tabular-nums`, tono apagado. */
export function CeldaDeDato({ children }: { children: ReactNode }) {
  return <span className={`truncate ${CLASES_DE_DATO}`}>{children}</span>;
}

/**
 * Dato de apoyo que no es un identificador: un tipo, un area, un nombre.
 * Label en apagada; Dato (mono) es solo para CURP, folios y fechas.
 */
export function CeldaDeApoyo({ children }: { children: ReactNode }) {
  return <span className={`truncate ${CLASES_DE_ETIQUETA}`}>{children}</span>;
}
