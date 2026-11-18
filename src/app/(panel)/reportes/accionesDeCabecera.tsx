import type { ReactNode } from "react";

/**
 * Las acciones de la cabecera de la bandeja: el alta -para quien escribe- y
 * la configuracion del atraso -solo `ADMIN_MUNICIPAL`-. Son dos y cada una
 * depende de un permiso distinto, asi que el `accion` de `PaginaDePanel`
 * recibe lo que haya: ninguna, una, o las dos en una fila.
 *
 * S5 de `reportes-ux`: registrar es la accion de la pantalla y configurar es
 * secundaria, asi que en el telefono -donde cada boton ocupa su renglon- la
 * primaria va arriba, y en escritorio las dos quedan a la derecha del titulo
 * con la primaria al final, que es el orden en que se leen.
 */
export function AccionesDeCabecera({
  alta,
  configuracion,
}: {
  alta?: ReactNode;
  configuracion?: ReactNode;
}) {
  if (!alta) return <>{configuracion}</>;
  if (!configuracion) return <>{alta}</>;

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
      {configuracion}
      {alta}
    </div>
  );
}
