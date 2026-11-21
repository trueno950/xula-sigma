import { CaretDown } from "@phosphor-icons/react/ssr";
import { ANILLO_DE_FOCO, InsigniaDeEstado } from "@/shared/ui";
import type { UsuarioDelPanel } from "../domain";
import { AccionesDeUsuario } from "./AccionesDeUsuario";
import type { PermisosDeCuenta } from "./permisosDeCuenta";

/**
 * Una cuenta del listado, y **la cuenta entera es el acordeon** (S2 de
 * `usuarios-ux`): asi el acordeon no compite con una columna de acciones ni
 * obliga a abrir un desplegable pequeño al final de una fila. El `name`
 * compartido los vuelve exclusivos sin estado de cliente, el mismo mecanismo
 * que `AccionesDeIntervencion` y `AccionesDeReporte`.
 *
 * La fila cerrada no insinua que haya acciones salvo por el chevron: es el
 * costo declarado del diseño (`design/usuarios-listado/02-agrupado-por-rol.html`).
 *
 * La propia cuenta aparece, y al abrirla explica por que no ofrece nada (S1):
 * esconder el boton sin decir por que deja a la operadora buscandolo.
 */

/** El mismo `name` para todas: abrir una cierra la anterior. */
const GRUPO = "accionesDeCuenta";

const CLASES_DE_SUMMARY =
  "grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_24px] " +
  "items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors duration-150 " +
  "ease-salida hover:bg-caliza-superficie [&::-webkit-details-marker]:hidden";

const SIN_ACCIONES = "Sin acciones: esta cuenta no se administra desde aquí.";

const SIN_ACCIONES_PROPIAS =
  "Sin acciones sobre su propia cuenta: no se restablece su contraseña desde aquí y nadie se da de baja a sí mismo.";

export function FilaDeCuenta({
  usuario,
  permisos,
  esSuCuenta,
}: {
  usuario: UsuarioDelPanel;
  permisos: PermisosDeCuenta | null;
  esSuCuenta: boolean;
}) {
  return (
    <li>
      <details name={GRUPO} className="group">
        <summary className={`${CLASES_DE_SUMMARY} ${ANILLO_DE_FOCO}`}>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-caliza-tinta">
              {usuario.nombre}
              {esSuCuenta ? (
                <span className="text-[13px] font-medium text-caliza-apagada">
                  {" · su cuenta"}
                </span>
              ) : null}
            </span>
            <span className="truncate text-[13px] text-caliza-apagada">
              {usuario.email}
            </span>
          </span>
          <InsigniaDeEstado tono="exito" etiqueta="Activo" />
          <CaretDown
            size={20}
            weight="bold"
            aria-hidden="true"
            className="shrink-0 text-caliza-apagada transition-transform duration-150 group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-3 border-t border-caliza-divisor bg-caliza-superficie p-4">
          {permisos ? (
            <AccionesDeUsuario
              usuarioId={usuario.id}
              nombre={usuario.nombre}
              {...permisos}
            />
          ) : (
            <p className="text-[13px] text-caliza-apagada">
              {esSuCuenta ? SIN_ACCIONES_PROPIAS : SIN_ACCIONES}
            </p>
          )}
        </div>
      </details>
    </li>
  );
}
