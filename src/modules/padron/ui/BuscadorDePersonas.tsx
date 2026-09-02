import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { Boton, CLASES_DE_ETIQUETA, clasesDeCampo } from "@/shared/ui";

type Props = {
  /** `searchParams.q` de `/padron`, para que el campo no se vacie al postear. */
  cadena?: string;
};

/**
 * `<form method="get">` nativo, sin `"use client"` ni Server Action: la
 * busqueda es una lectura, y una lectura ya tiene URL propia en la Web
 * -`?q=...`-, no hace falta inventarle una. El navegador arma el GET solo;
 * `/padron?q=gpe+kumul` funciona con JavaScript apagado, que es el mismo
 * criterio que ya uso `FormularioDeAltaDePersona` para el alta.
 *
 * No usa `Campo` aunque comparte sus clases: `Campo` envuelve el input en
 * su propia columna con ayuda y error, y aca el input tiene que compartir
 * renglon con el boton. La cadena de clases es la misma funcion, que es lo
 * que importa que no diverja.
 *
 * La ayuda de abajo dice por que el campo, y no un placeholder: al escribir
 * el placeholder desaparece y con el la unica pista de que la busqueda
 * tambien alcanza a la CURP.
 */
export function BuscadorDePersonas({ cadena }: Props) {
  return (
    <form method="get" className="flex flex-col gap-1">
      <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
        Buscar persona
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={cadena}
            aria-describedby="q-ayuda"
            className={`${clasesDeCampo()} pl-9`}
          />
        </div>
        <Boton type="submit">Buscar</Boton>
      </div>
      <p id="q-ayuda" className={CLASES_DE_ETIQUETA}>
        Nombre, apellidos o CURP. No distingue acentos.
      </p>
    </form>
  );
}
