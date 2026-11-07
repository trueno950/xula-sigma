import {
  ArrowsOutCardinal,
  PencilSimple,
  Prohibit,
} from "@phosphor-icons/react/ssr";
import type { EstadoDeAccion } from "./bloqueosDeLugar";
import { type PropsDeContenido, rutaDe } from "./contenido";
import {
  type ClaveDeEdicion,
  domiciliosDe,
  estadosDeEdicion,
  padreDe,
} from "./estadosDeEdicion";
import { FormularioDeBajaDeLugar } from "./FormularioDeBajaDeLugar";
import { FormularioDeEdicionDeLugar } from "./FormularioDeEdicionDeLugar";
import { FormularioDeReparenteo } from "./FormularioDeReparenteo";
import { PanelDeAccion } from "./PanelDeAccion";
import { PieDeFormulario } from "./PieDeFormulario";
import { puedeAbrir } from "./permisos";
import { type ItemDeEdicion, RenglonDeEdicion } from "./RenglonDeEdicion";

/**
 * Cada accion trae su descripcion, y no es adorno: "Mover" no dice que se
 * lleva todo lo que cuelga debajo, y esa es exactamente la consecuencia que
 * el operador necesita saber **antes** de abrir el formulario.
 */
const ACCIONES: readonly ItemDeEdicion[] = [
  {
    clave: "renombrar",
    etiqueta: "Renombrar",
    descripcion: "Corregir el nombre del lugar.",
    Icono: PencilSimple,
  },
  {
    clave: "reparentear",
    etiqueta: "Mover",
    descripcion: "Colgarlo de otro lugar. Se mueve con todo lo que tiene.",
    Icono: ArrowsOutCardinal,
  },
  {
    clave: "baja",
    etiqueta: "Dar de baja",
    descripcion: "Sale del registro. Se rechaza si tiene algo adentro.",
    Icono: Prohibit,
    destructiva: true,
  },
];

/** El motivo en lugar del formulario, con la salida de siempre. */
function MotivoEnLugarDelFormulario({
  motivo,
  volverA,
}: {
  motivo: string;
  volverA: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-caliza-tinta">{motivo}</p>
      <PieDeFormulario volverA={volverA} />
    </div>
  );
}

/** Pestana Editar: los cambios al lugar mismo, fuera del camino diario. */
export function TabDeEdicion(props: PropsDeContenido) {
  const { raizId, lugar, nodos, lugares, accion, permisos } = props;
  const estados = estadosDeEdicion(props);
  const disponibles = ACCIONES.filter(
    (item) =>
      puedeAbrir(item.clave, permisos) &&
      estados[item.clave].clase !== "oculta",
  );

  if (disponibles.length === 0) return null;

  const volverA = rutaDe({ raizId: raizId, nodoId: lugar.id, vista: "editar" });
  const abierta = (clave: ClaveDeEdicion): EstadoDeAccion | undefined =>
    accion === clave && puedeAbrir(clave, permisos)
      ? estados[clave]
      : undefined;
  const mover = abierta("reparentear");
  const baja = abierta("baja");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col">
        {disponibles.map((item) => (
          <RenglonDeEdicion
            key={item.clave}
            item={item}
            estado={estados[item.clave]}
            href={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "editar",
              accion: item.clave,
            })}
            actual={accion === item.clave}
          />
        ))}
      </ul>

      {abierta("renombrar") ? (
        <PanelDeAccion titulo={`Renombrar ${lugar.nombre}`}>
          <FormularioDeEdicionDeLugar
            raiz={raizId}
            nodo={lugar.id}
            nombreActual={lugar.nombre}
            volverA={volverA}
          />
        </PanelDeAccion>
      ) : null}

      {mover && mover.clase !== "oculta" ? (
        <PanelDeAccion titulo={`Mover ${lugar.nombre}`}>
          {mover.clase === "bloqueada" ? (
            <MotivoEnLugarDelFormulario
              motivo={mover.motivo}
              volverA={volverA}
            />
          ) : (
            <FormularioDeReparenteo
              raiz={raizId}
              nodo={lugar.id}
              tipoDelLugar={lugar.tipo}
              lugares={lugares}
              padre={padreDe(nodos, lugar.id)}
              volverA={volverA}
              domicilios={domiciliosDe(props)}
            />
          )}
        </PanelDeAccion>
      ) : null}

      {baja ? (
        <PanelDeAccion titulo="Baja de lugar">
          {baja.clase === "bloqueada" ? (
            <MotivoEnLugarDelFormulario
              motivo={baja.motivo}
              volverA={volverA}
            />
          ) : (
            <FormularioDeBajaDeLugar
              raiz={raizId}
              nodo={lugar.id}
              padre={padreDe(nodos, lugar.id)}
              nombre={lugar.nombre}
              volverA={volverA}
            />
          )}
        </PanelDeAccion>
      ) : null}
    </div>
  );
}
