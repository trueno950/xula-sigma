import { Boton, CLASES_DE_ETIQUETA, CLASES_DE_TARJETA } from "@/shared/ui";
import { descartarClaveMostradaAction } from "./actions/descartarClaveMostradaAction";
import { BotonDeCopiar } from "./BotonDeCopiar";
import type { MotivoDeClaveMostrada } from "./claveMostrada";
import { tituloDelRol } from "./descripcionesDeRol";

/**
 * La tarjeta de la contrasenia temporal **con la clave en la mano**
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`).
 *
 * Vive aparte de `AvisoDeClaveTemporal` porque la pintan dos caminos: el
 * servidor, en la navegacion de documento —el camino sin JavaScript, que es lo
 * unico que ese navegador puede ver—, y la isla `ClaveTemporalAlMostrar`,
 * cuando la clave se pide despues de montar la pantalla (S4 de
 * `usuarios-seguridad`). Con una sola copia del marcado, los dos caminos no se
 * pueden separar: es la tarjeta que la operadora copia y la que dice de quien
 * es.
 *
 * Va en una tarjeta propia y no en un `Aviso` porque no es un estado del
 * formulario: es un dato que la operadora tiene que copiar antes de seguir
 * navegando. En monoespaciada y sin partirse —una `l` y un `1` se confunden
 * cuando el texto se corta en dos renglones—.
 *
 * **Dice de quien es** (C4, S10): el nombre en el titulo y el correo y el rol
 * al lado. Mientras la tarjeta esta visible, el listado de abajo sigue
 * ofreciendo «Restablecer» en otras filas, y una clave sin duenio escrito se
 * confunde con la cuenta de al lado.
 *
 * La tarjeta se queda hasta que la operadora dice que ya la anoto (S9): el
 * boton es un `<form>` nativo —anda sin JavaScript— que borra la cookie y
 * vuelve al listado sin el token en la URL. «Copiar» lo pinta una isla cliente
 * y sin JavaScript no existe: `BotonDeCopiar.tsx`.
 */

/** El id con el que «Copiar» encuentra la clave en el DOM. */
export const ID_DE_LA_CLAVE = "clave-entregada";

/** Lo que la tarjeta necesita de la cuenta: a quien se le entrega la clave. */
export type UsuarioDeLaClave = {
  nombre: string;
  email: string;
  /** Texto del listado; el nombre legible lo pone `tituloDelRol`. */
  rol: string;
};

/**
 * El titulo dice **por que** la persona tiene una clave temporal: no es lo
 * mismo una cuenta nueva que una que perdio la suya o una que vuelve de una
 * baja (S3). Es el `motivo` que la accion guardo junto a la clave, no una
 * deduccion de la pantalla.
 */
const ENCABEZADOS: Record<MotivoDeClaveMostrada, string> = {
  alta: "Contraseña temporal",
  restablecimiento: "Nueva contraseña temporal",
  reactivacion: "Contraseña temporal de reactivación",
};

export const encabezadoDeLaClave = (motivo: MotivoDeClaveMostrada): string =>
  ENCABEZADOS[motivo];

export function TarjetaDeClave({
  motivo,
  usuario,
  token,
  clave,
}: {
  motivo: MotivoDeClaveMostrada;
  usuario: UsuarioDeLaClave;
  token: string;
  clave: string;
}) {
  const encabezado = encabezadoDeLaClave(motivo);
  // El correo y el rol del listado, en una linea: la clave puede estar en
  // pantalla por un alta, un restablecimiento o una reactivacion, y el aviso
  // dice cual.
  const identidad = `${usuario.email} · rol ${tituloDelRol(usuario.rol)}`;

  return (
    <section
      aria-label={encabezado}
      className={`flex flex-col gap-4 ${CLASES_DE_TARJETA} border-caliza-borde`}
    >
      <p className="flex flex-col gap-0.5">
        <span className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
          {encabezado} de {usuario.nombre}
        </span>
        <span className={CLASES_DE_ETIQUETA}>{identidad}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <span className={CLASES_DE_ETIQUETA}>Contraseña de un solo uso</span>
        <div className="flex flex-wrap items-center gap-2">
          <p
            id={ID_DE_LA_CLAVE}
            className="inline-flex min-h-[52px] items-center rounded-md border border-caliza-borde bg-caliza-superficie px-4 py-2 font-mono text-[1.25rem] tracking-[0.06em] whitespace-nowrap text-caliza-tinta select-all"
          >
            {clave}
          </p>
          <BotonDeCopiar objetivo={ID_DE_LA_CLAVE} />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="max-w-[46ch] text-[15px] text-caliza-tinta">
            {`Anótela o entréguesela ahora a ${usuario.nombre}. Esta pantalla no se la vuelve a mostrar.`}
          </p>
          <p className="max-w-[46ch] text-[13px] text-caliza-apagada">
            Si no hay JavaScript, seleccione la contraseña con el dedo o el
            ratón: el texto se puede copiar a mano.
          </p>
        </div>
        <form action={descartarClaveMostradaAction} className="w-fit">
          <input type="hidden" name="token" value={token} />
          <Boton type="submit" variante="primaria">
            Ya la anoté
          </Boton>
        </form>
      </div>
    </section>
  );
}
