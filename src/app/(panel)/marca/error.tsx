"use client";

import { Aviso } from "@/shared/ui";
import { Boton } from "@/shared/ui/Boton";

/**
 * El limite de `/marca`: lo que ve la operadora cuando la pantalla se rompe
 * antes de pintarse, en vez de la pantalla de error del framework —en
 * ingles, sin encabezado ni salida—.
 *
 * El caso que lo alcanza es el unico rechazo que el servidor no puede
 * redactar: un cuerpo de mas de 2 MB, que Next corta antes de invocar la
 * accion (el tope del transporte de Server Actions). La oracion nombra esa
 * salida —un escudo de hasta 1 MiB— sin afirmar que la causa fue esa, porque
 * cualquier otra caida de la pantalla tambien cae aca.
 */
export default function ErrorDeMarca({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Aviso tono="error">
        No se pudo completar la operación. Si estaba subiendo un escudo, elija
        uno de hasta 1 MiB e intente de nuevo.
      </Aviso>
      <Boton type="button" variante="secundaria" onClick={reset}>
        Intentar de nuevo
      </Boton>
    </div>
  );
}
