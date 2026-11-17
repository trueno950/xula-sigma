import type { MarcadorDeMapa } from "../domain";
import { FilaDeCalle } from "./FilaDeCalle";

type Props = {
  marcadores: readonly MarcadorDeMapa[];
  /** La calle elegida, por su clave; `null` si no hay ninguna. */
  elegida: string | null;
  onSeleccion: (clave: string | null) => void;
};

const VACIA = "px-4 py-6 text-[15px] text-caliza-apagada";

/**
 * La lista del panel: una fila por calle dibujada, en el mismo orden en que
 * el mapa numera sus pines. Es el camino sin JavaScript -y el de quien no
 * puede usar el mapa (S7)-, asi que dice lo mismo que cada ventana: cuantos
 * hechos lleva la calle y cuales son.
 */
export function ListaDeMarcadores({ marcadores, elegida, onSeleccion }: Props) {
  if (marcadores.length === 0) {
    return (
      <p className={VACIA}>
        Ningún hecho tiene el punto de su calle. El mapa muestra todo Yucatán.
      </p>
    );
  }

  return (
    <ul aria-label="Calles con hechos" className="flex flex-col">
      {marcadores.map((marcador) => (
        <FilaDeCalle
          key={marcador.clave}
          marcador={marcador}
          elegida={elegida === marcador.clave}
          onSeleccion={onSeleccion}
        />
      ))}
    </ul>
  );
}
