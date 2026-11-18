import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import {
  CLASES_DE_DATO,
  CLASES_DE_ETIQUETA,
  CLASES_DE_TARJETA,
  InsigniaDeEstado,
} from "@/shared/ui";

type Props = {
  nombre: string;
  /** La CURP capturada; `null` cuando todavía no se capturó. */
  curp: string | null;
  /**
   * El texto de la residencia vigente, que la página deriva del historial
   * que ya lee. `null` cuando no hay residencia abierta o la dirección ya
   * no se puede leer.
   */
  domicilioVigente: string | null;
  /** El `<Migaja>` de `shared/ui`, que arma la página. */
  migaja: ReactNode;
  /** «Emitir constancia»: la única acción primaria de la pantalla. */
  acciones?: ReactNode;
  /** El contenido del pliegue de la mudanza; su formulario, ya compuesto. */
  mudanza?: ReactNode;
  /**
   * S8: el pliegue se abre solo cuando no hay nada que plegar -una persona
   * sin residencias, o la vuelta del alta de un domicilio, donde el aviso
   * de lo que acaba de pasar quedaría escondido-.
   */
  abrirMudanza?: boolean;
  children: ReactNode;
};

const CLASES_DE_SUMMARY =
  "flex min-h-11 w-full cursor-pointer list-none items-center gap-2 rounded-md " +
  "border border-caliza-borde bg-caliza-lienzo px-3.5 py-2.5 text-left " +
  "text-[15px] font-semibold text-caliza-tinta transition-colors duration-150 " +
  "ease-salida hover:bg-caliza-superficie [&::-webkit-details-marker]:hidden";

/**
 * La cabecera de la ficha (S11): el nombre como `h1`, la CURP y el domicilio
 * vigente en una ficha compacta, y las dos acciones de mostrador que no
 * dependen de ninguna pestaña.
 *
 * El armazón de la página se compone acá y no con `PaginaDePanel` porque ese
 * componente pone el `h1` fuera de la tarjeta, y esta pantalla pide el
 * nombre adentro, junto a los datos que identifica.
 *
 * La CURP vacía se pinta como pendiente con texto y no como un hueco: un
 * dato que falta es una tarea, y el gris solo no lo dice. El pendiente no
 * nombra «Corregir datos…» porque un rol de consulta lee esta cabecera y no
 * tiene esa acción.
 *
 * La mudanza es un `<details>` con la misma `name` que los pliegues de
 * «Administrar» (S10): abrir cualquiera cierra el otro, sin JavaScript.
 */
export function FichaDePersona({
  nombre,
  curp,
  domicilioVigente,
  migaja,
  acciones,
  mudanza,
  abrirMudanza = false,
  children,
}: Props) {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      {migaja}
      <header className={`flex flex-col gap-4 ${CLASES_DE_TARJETA}`}>
        <h1 className="text-[1.75rem] leading-[1.15] font-[650] tracking-[-0.02em] text-caliza-tinta">
          {nombre}
        </h1>

        <div className="flex flex-col gap-1">
          <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div className="flex items-baseline gap-2">
              <dt className={CLASES_DE_ETIQUETA}>CURP</dt>
              <dd>
                {curp ? (
                  <span className={CLASES_DE_DATO}>{curp}</span>
                ) : (
                  <InsigniaDeEstado tono="aviso" etiqueta="Sin CURP" />
                )}
              </dd>
            </div>
          </dl>
          {curp ? null : (
            <p className={CLASES_DE_ETIQUETA}>Pendiente de capturar.</p>
          )}
        </div>

        <div className="flex flex-col gap-1 rounded-md bg-caliza-superficie px-4 py-3">
          <p className={CLASES_DE_ETIQUETA}>Domicilio vigente</p>
          {domicilioVigente ? (
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-caliza-tinta">
              {domicilioVigente}
              <InsigniaDeEstado tono="exito" etiqueta="Vigente" />
            </p>
          ) : (
            <p className="text-[15px] text-caliza-apagada">Sin domicilio</p>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-3 max-sm:[&>*]:w-full">
          {acciones}
          {mudanza ? (
            <details
              name="acciones-de-la-ficha"
              open={abrirMudanza}
              className="group min-w-0"
            >
              <summary className={CLASES_DE_SUMMARY}>
                Registrar mudanza…
                <CaretDown
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                  className="ml-auto shrink-0 transition-transform duration-150 group-open:rotate-180"
                />
              </summary>
              <div className="mt-2 flex flex-col gap-3 rounded-md bg-caliza-superficie p-3.5">
                {mudanza}
              </div>
            </details>
          ) : null}
        </div>
      </header>
      {children}
    </main>
  );
}
