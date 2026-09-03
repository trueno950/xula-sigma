import type { PropsDeContenido } from "./contenido";
import type { TabDeLugar } from "./PanelDeNodo";
import { TabDeCalles } from "./TabDeCalles";
import { TabDeDomicilios } from "./TabDeDomicilios";
import { TabDeEdicion } from "./TabDeEdicion";
import { TabDeLugares } from "./TabDeLugares";

type Props = PropsDeContenido & { vista: TabDeLugar };

/**
 * Lo que tiene el lugar actual, de a una categoria a la vez: la pestana
 * activa viene de `?vista=` (la pagina la deriva de `?accion=` cuando la
 * hay). La navegacion es "adentro del lugar": entrar a un hijo fija
 * `?nodo=`, y la migaja del panel es el camino atras.
 */
export function ContenidoDeLugar({ vista, ...resto }: Props) {
  return (
    <section
      aria-label={`Contenido de ${resto.lugar.nombre}`}
      className="flex flex-col gap-4"
    >
      {contenidoDe(vista, resto)}
    </section>
  );
}

const contenidoDe = (vista: TabDeLugar, resto: PropsDeContenido) => {
  switch (vista) {
    case "calles":
      return <TabDeCalles {...resto} />;
    case "domicilios":
      return <TabDeDomicilios {...resto} />;
    case "editar":
      return <TabDeEdicion {...resto} />;
    default:
      return <TabDeLugares {...resto} />;
  }
};
