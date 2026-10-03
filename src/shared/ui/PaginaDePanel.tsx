import type { ReactNode } from "react";

const ANCHOS = {
  /** Listados: el ancho de `DESIGN.md`, "Estructura de la aplicacion", para tablas y fichas. */
  lista: "max-w-[1200px]",
  /** Detalle de un registro. */
  detalle: "max-w-[720px]",
  /** Captura: angosto a proposito, para que el campo no se estire. */
  formulario: "max-w-[720px]",
} as const;

type Props = {
  titulo: string;
  /** Una linea bajo el titulo que dice para que sirve la pantalla. */
  descripcion?: string;
  /**
   * Lo que el titulo es, en una palabra, cuando el nombre solo no lo dice:
   * "Colonia Centro" y "Colonia". Va como pastilla junto al titulo.
   */
  etiqueta?: string;
  /** La unica accion primaria de la pantalla, si la hay. */
  accion?: ReactNode;
  /** El `<Migaja>` de `shared/ui`, si la pantalla esta a mas de un nivel. */
  migaja?: ReactNode;
  ancho?: keyof typeof ANCHOS;
  children: ReactNode;
};

/**
 * El contenedor de toda pantalla del panel: ancho, respiro y la cabecera
 * de titulo mas accion.
 *
 * Existe porque no existia. `mx-auto flex min-h-dvh max-w-4xl flex-col
 * gap-6 p-6` estaba copiado en cinco `page.tsx`, con un ancho distinto en
 * cada uno y sin ninguna razon detras de la diferencia. Un ancho es una
 * decision de diseno; repetida a mano deja de serlo.
 *
 * `min-h-dvh` se fue con la copia: el layout del panel ya ocupa la ventana
 * entera, y estirar tambien el `<main>` sumaba 64px de scroll vacio abajo
 * de cada pantalla.
 */
export function PaginaDePanel({
  titulo,
  descripcion,
  etiqueta,
  accion,
  migaja,
  ancho = "lista",
  children,
}: Props) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8 ${ANCHOS[ancho]}`}
    >
      {migaja}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[1.75rem] leading-[1.15] font-[650] tracking-[-0.02em] text-caliza-tinta">
              {titulo}
            </h1>
            {etiqueta ? (
              <span className="inline-flex h-6 items-center rounded-pill bg-caliza-relleno px-2.5 text-[13px] leading-none font-medium text-caliza-tinta">
                {etiqueta}
              </span>
            ) : null}
          </div>
          {descripcion ? (
            <p className="max-w-[70ch] text-[15px] text-caliza-apagada">
              {descripcion}
            </p>
          ) : null}
        </div>
        {accion ? <div className="min-w-0 max-w-full">{accion}</div> : null}
      </div>
      {children}
    </main>
  );
}

/**
 * La pantalla de un solo mensaje: sesion que no resuelve, rol sin permiso,
 * registro que no existe. Tambien estaba copiada cinco veces, con el mismo
 * `<p>` suelto y sin salida — el operador quedaba en una pantalla en blanco
 * sin nada donde hacer clic.
 */
export function PantallaDeMensaje({
  mensaje,
  accion,
}: {
  mensaje: string;
  accion?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 py-16 md:px-6">
      <p className="text-[15px] text-caliza-apagada">{mensaje}</p>
      {accion}
    </main>
  );
}
