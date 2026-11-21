import { Boton, CLASES_DE_TARJETA } from "@/shared/ui";
import { descartarClaveMostradaAction } from "./actions/descartarClaveMostradaAction";
import type { ClaveMostrada } from "./claveMostrada";
import { DescartarClaveAlMostrar } from "./DescartarClaveAlMostrar";

/**
 * La contrasenia temporal, la unica vez que se muestra (S4).
 *
 * Va en una tarjeta propia y no en un `Aviso` porque no es un estado del
 * formulario: es un dato que la operadora tiene que copiar antes de seguir
 * navegando. En monoespaciada y sin partirse —una `l` y un `1` se confunden
 * cuando el texto se corta en dos renglones—. El recordatorio de que no se
 * vuelve a mostrar va despues del valor, que es lo que se lee primero.
 *
 * La tarjeta se queda hasta que la operadora dice que ya la anoto (S9): el
 * boton es un `<form>` nativo —anda sin JavaScript— que borra la cookie y
 * vuelve al listado sin el token en la URL. El descarte del montaje existe
 * para que la clave no se pueda volver a mostrar al recargar, y borra la
 * cookie sin redibujar la ruta: ver `DescartarClaveAlMostrar.tsx`.
 */
export function AvisoDeClaveTemporal({
  mostrada,
  nombre,
}: {
  mostrada: ClaveMostrada;
  nombre: string;
}) {
  const encabezado =
    mostrada.motivo === "alta"
      ? "Contraseña temporal"
      : "Nueva contraseña temporal";

  return (
    <section
      aria-label={encabezado}
      className={`flex flex-col gap-2 ${CLASES_DE_TARJETA}`}
    >
      <p className="text-[15px] font-semibold text-caliza-tinta">
        {encabezado} de {nombre}
      </p>
      <p className="w-fit rounded-md bg-caliza-relleno px-3 py-2 font-mono text-[18px] tracking-[0.06em] whitespace-nowrap text-caliza-tinta">
        {mostrada.clave}
      </p>
      <p className="text-[15px] text-caliza-apagada">
        Anótela ahora: esta pantalla no la vuelve a mostrar.
      </p>
      <form action={descartarClaveMostradaAction} className="w-fit">
        <input type="hidden" name="token" value={mostrada.token} />
        <Boton type="submit" variante="secundaria">
          Ya la anoté
        </Boton>
      </form>
      <DescartarClaveAlMostrar token={mostrada.token} />
    </section>
  );
}
