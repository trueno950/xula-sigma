import type { Marca } from "@/shared/marca";
import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { cambiarColoresAction } from "./actions/cambiarColoresAction";
import { GrupoDeColores } from "./GrupoDeColores";
import { MuestraDeColores } from "./MuestraDeColores";
import { seleccionDeColor, VALOR_LIBRE } from "./seleccionDeColor";

type Props = {
  marca: Marca;
};

/** El color que el formulario arranca mostrando en la muestra. */
const inicial = (actual: string | undefined): string => {
  const { radio, libre } = seleccionDeColor(actual);

  return radio === VALOR_LIBRE ? libre : radio;
};

/**
 * Elegir los colores del municipio (S1-S3): es el cuerpo de la fila
 * «Colores del municipio».
 *
 * La muestra va **primero** (S1): en el celular, el formulario abre con ella
 * y las dos paletas van despues, asi que se elige con la muestra adentro de la
 * misma seccion y a la vista, en vez de una columna que quedaba fuera de
 * pantalla mientras se recorrian los grupos (hallazgo M1).
 *
 * Es un componente del servidor: no tiene estado ni `"use client"`, y su
 * unico hijo cliente es `MuestraDeColores`, que no interviene en el envio.
 * Por eso sin JavaScript el `<form>` sigue siendo un POST nativo completo y
 * los colores se guardan igual; la muestra aparece ya pintada al volver.
 */
export function FormularioDeColores({ marca }: Props) {
  return (
    <form action={cambiarColoresAction} className="flex flex-col gap-6">
      <MuestraDeColores
        primario={inicial(marca.primario)}
        secundario={inicial(marca.secundario)}
      />
      <GrupoDeColores
        campo="primario"
        etiqueta="Color primario"
        actual={marca.primario}
      />
      <GrupoDeColores
        campo="secundario"
        etiqueta="Color de acento"
        actual={marca.secundario}
      />
      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar colores
        </Boton>
        <p className="self-center text-[13px] leading-[1.4] text-caliza-apagada">
          Se aplican a todo el panel al guardar.
        </p>
      </BarraDeAcciones>
    </form>
  );
}
