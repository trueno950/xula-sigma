import type { ReactNode } from "react";

/**
 * Las acciones de la cabecera de la bandeja: el alta -para quien escribe- y
 * la configuracion del atraso -solo `ADMIN_MUNICIPAL`-. Son dos y cada una
 * depende de un permiso distinto, asi que el `accion` de `PaginaDePanel`
 * recibe lo que haya: ninguna, una, o las dos en una fila.
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
    <div className="flex flex-wrap gap-2">
      {configuracion}
      {alta}
    </div>
  );
}
