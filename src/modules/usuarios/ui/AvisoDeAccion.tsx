import { fechaEnMerida } from "@/shared/lib/fecha";
import { DescartarAvisoAlMostrar } from "./DescartarAvisoAlMostrar";

/**
 * El aviso de una baja (S13 y S14 de `usuarios-ux`), arriba del listado.
 *
 * **Dice de quien y desde cuando.** B2 de la auditoria era una confirmacion
 * generica: «La persona quedo dada de baja» no le dice nada a quien acaba de
 * dar de baja a una de dos personas con el mismo apellido. La fecha sale de
 * `bajaEn` de la fila, formateada por `shared/lib/fecha` (el servidor corre
 * en UTC; la fecha civil es la de Merida).
 *
 * **Lo dice una sola vez y lo avisa.** Sin JavaScript lo garantiza el proxy,
 * que consume la cookie en la unica peticion que trae el token; con
 * JavaScript, `DescartarAvisoAlMostrar`, porque el borrado del proxy no llega
 * al navegador por ese camino (`AGENTS.md`, nota de `usuarios`). La linea lo
 * dice porque, si no lo dijera, la operadora no sabria si puede confiar en
 * que no vuelve.
 *
 * Es `role="status"` y no `alert`: la accion salio bien y no hay nada que
 * interrumpir.
 */
export function AvisoDeAccion({
  nombre,
  bajaEn,
  token,
}: {
  nombre: string;
  bajaEn: Date | null;
  token: string;
}) {
  const cuando = bajaEn ? ` el ${fechaEnMerida(bajaEn)}` : "";

  return (
    <section
      role="status"
      className="flex flex-col gap-1 rounded-md bg-senial-exito-suave px-3 py-2"
    >
      <p className="text-[15px] font-medium text-caliza-tinta">
        {`Se dio de baja a ${nombre}${cuando}.`}
      </p>
      <p className="text-[15px] text-caliza-tinta">
        Ya no puede entrar al panel.
      </p>
      <p className="text-[13px] text-caliza-apagada">
        Este aviso se muestra una sola vez: recargar la página no lo repite.
      </p>
      <DescartarAvisoAlMostrar token={token} />
    </section>
  );
}
