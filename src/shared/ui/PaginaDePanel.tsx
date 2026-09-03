import type { ReactNode } from "react";

const ANCHOS = {
  /** Listados: el ancho donde una fila de 44px todavia se barre de un ojo. */
  lista: "max-w-4xl",
  /** Detalle de un registro. */
  detalle: "max-w-2xl",
  /** Captura: angosto a proposito, para que el campo no se estire. */
  formulario: "max-w-md",
} as const;

type Props = {
  titulo: string;
  /** La unica accion primaria de la pantalla, si la hay. */
  accion?: ReactNode;
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
  accion,
  ancho = "lista",
  children,
}: Props) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6 ${ANCHOS[ancho]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-caliza-tinta">
          {titulo}
        </h1>
        {accion}
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
