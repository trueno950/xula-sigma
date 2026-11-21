import { ShieldSlash } from "@phosphor-icons/react/ssr";
import { FormularioDeEscudo } from "./FormularioDeEscudo";
import { FormularioDeQuitarEscudo } from "./FormularioDeQuitarEscudo";
import { ImagenDeEscudo } from "./ImagenDeEscudo";
import type { ClaveDeErrorDeEscudo } from "./mensajesDeMarca";

type Props = {
  nombre: string;
  escudo: string | undefined;
  error: ClaveDeErrorDeEscudo | undefined;
};

/**
 * El cuerpo de la fila del escudo (S7): que escudo hay —o «Sin escudo»—,
 * donde se ve, la subida de siempre y, cuando hay algo que quitar, «Quitar
 * escudo».
 *
 * El estado va en texto, no solo en la imagen: quien no ve el escudo tiene que
 * poder leer que hay uno y que quitarlo deja la banda solo con el nombre.
 *
 * Sin escudo no se ofrece el boton: no hay nada que quitar. El caso de uso
 * igual lo resuelve sin error, porque esconder un boton no es autorizacion y
 * un POST a mano sigue llegando.
 */
export function EscudoActual({ nombre, escudo, error }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-18 shrink-0 place-items-center rounded-sm bg-marca-tenue">
          {escudo ? (
            <ImagenDeEscudo
              escudo={escudo}
              className="size-12 object-contain"
            />
          ) : (
            <ShieldSlash
              size={28}
              aria-hidden="true"
              className="text-caliza-apagada"
            />
          )}
        </div>
        <div className="min-w-0 max-w-[52ch]">
          <p className="text-[15px] leading-[1.4] font-semibold text-caliza-tinta">
            {escudo ? "Escudo actual" : "Sin escudo"}
          </p>
          <p className="text-[13px] leading-[1.4] text-caliza-apagada">
            {escudo
              ? "El que se ve en la banda del municipio, arriba de la navegación. Sin escudo, la banda queda solo con el nombre."
              : "La banda del municipio muestra solo el nombre. No hay «Quitar escudo» porque no hay nada que quitar."}
          </p>
        </div>
      </div>

      <FormularioDeEscudo error={error} />

      {escudo ? (
        <div className="flex flex-col gap-4">
          <div role="presentation" className="h-px bg-caliza-divisor" />
          <FormularioDeQuitarEscudo nombre={nombre} />
        </div>
      ) : null}
    </div>
  );
}
