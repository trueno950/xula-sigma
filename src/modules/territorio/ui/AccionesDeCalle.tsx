import {
  ArrowsOutCardinal,
  MapPin,
  PencilSimple,
  Prohibit,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { EnlaceDeItemDeAccion, ItemDeAccion } from "@/shared/ui";
import { rutaDe } from "./contenido";
import {
  type DatosDeFormularioDeCalle,
  FormularioDeAccionDeCalle,
} from "./FormulariosDeCalle";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import type { AccionDeCalle } from "./tipoDeAccionDeCalle";

type DefinicionDeAccion = {
  accion: AccionDeCalle;
  etiqueta: string;
  Icono: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

const ACCIONES: readonly DefinicionDeAccion[] = [
  { accion: "ubicarCalle", etiqueta: "Ubicar en el mapa", Icono: MapPin },
  { accion: "renombrarCalle", etiqueta: "Renombrar", Icono: PencilSimple },
  {
    accion: "reparentearCalle",
    etiqueta: "Mover a otro lugar",
    Icono: ArrowsOutCardinal,
  },
  { accion: "bajaCalle", etiqueta: "Dar de baja", Icono: Prohibit },
];

export const esAccionDeCalle = (
  accion: AccionDeNodo | undefined,
): accion is AccionDeCalle => ACCIONES.some((item) => item.accion === accion);

type Props = {
  datos: DatosDeFormularioDeCalle;
  permisos: PermisosDeTerritorio;
  accionAbierta: AccionDeCalle | undefined;
};

function Renglon({
  item,
  abierto,
  datos,
}: {
  item: DefinicionDeAccion;
  abierto: boolean;
  datos: DatosDeFormularioDeCalle;
}) {
  const { raizId, nodoId, calle } = datos;
  if (item.accion === "ubicarCalle" && !abierto) {
    const ruta = rutaDe({
      raizId,
      nodoId,
      vista: "calles",
      calleId: calle.id,
      accion: item.accion,
    });
    return (
      <EnlaceDeItemDeAccion
        etiqueta={item.etiqueta}
        Icono={item.Icono}
        href={`${ruta}#panel-de-calle`}
      />
    );
  }
  const destructiva = item.accion === "bajaCalle";
  return (
    <div
      className={destructiva ? "mt-2 border-t border-caliza-divisor pt-2" : ""}
    >
      <ItemDeAccion
        grupo="acciones-de-calle"
        etiqueta={item.etiqueta}
        Icono={item.Icono}
        abierto={abierto}
        destructiva={destructiva}
      >
        <FormularioDeAccionDeCalle accion={item.accion} datos={datos} />
      </ItemDeAccion>
    </div>
  );
}

/**
 * Cuatro acciones en una lista compacta, cada una con su formulario en un
 * `<details>` exclusivo. "Ubicar" abre sola cuando la calle no tiene punto.
 *
 * El mapa de Leaflet mide su contenedor al montarse: dentro de un detalle
 * cerrado mediria 0. Por eso "Ubicar" solo se pinta como detalle cuando ya
 * nace abierta; si no, es un enlace que recarga con el mapa visible.
 */
export function AccionesDeCalle({ datos, permisos, accionAbierta }: Props) {
  const porDefecto =
    accionAbierta ?? (datos.calle.punto ? undefined : "ubicarCalle");

  return (
    <div className="flex flex-col gap-1">
      {ACCIONES.filter((item) => puedeAbrir(item.accion, permisos)).map(
        (item) => (
          <Renglon
            key={item.accion}
            item={item}
            abierto={item.accion === porDefecto}
            datos={datos}
          />
        ),
      )}
    </div>
  );
}
