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
 */
export function BuscadorDePersonas({ cadena }: Props) {
  return (
    <form method="get" className="flex flex-col gap-1">
      <label
        htmlFor="q"
        className="text-[13px] font-medium text-caliza-apagada"
      >
        Buscar persona
      </label>
      <div className="flex gap-2">
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={cadena}
          className="h-11 flex-1 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca"
        />
        <button
          type="submit"
          className="h-11 rounded-sm border border-caliza-borde px-4 text-[15px] font-medium text-caliza-tinta"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
