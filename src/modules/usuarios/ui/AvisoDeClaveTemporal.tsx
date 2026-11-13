import { CLASES_DE_TARJETA } from "@/shared/ui";
import type { ClaveMostrada } from "./claveMostrada";
import { DescartarClaveAlMostrar } from "./DescartarClaveAlMostrar";

/**
 * La contrasenia temporal, la unica vez que se muestra (S4).
 *
 * Va en una tarjeta propia y no en un `Aviso` porque no es un estado del
 * formulario: es un dato que la operadora tiene que copiar antes de seguir
 * navegando. En monoespaciada y sin partirse —una `l` y un `1` se confunden
 * cuando el texto se corta en dos renglones—. El recordatorio de que no se
 * vuelve a mostrar va despues del valor, que es lo ultimo que se lee.
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
      <DescartarClaveAlMostrar token={mostrada.token} />
    </section>
  );
}
