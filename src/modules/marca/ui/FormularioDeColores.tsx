import type { Marca } from "@/shared/marca";
import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { CLASES_DE_FORMULARIO } from "@/shared/ui/estilos";
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
 * Elegir los colores del municipio (S1-S4).
 *
 * Es un componente del servidor: no tiene estado ni `"use client"`, y su
 * unico hijo cliente es `MuestraDeColores`, que no interviene en el envio.
 * Por eso sin JavaScript el `<form>` sigue siendo un POST nativo completo y
 * los colores se guardan igual; la muestra aparece ya pintada al volver.
 */
export function FormularioDeColores({ marca }: Props) {
  return (
    <form action={cambiarColoresAction} className={CLASES_DE_FORMULARIO}>
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
      <MuestraDeColores
        primario={inicial(marca.primario)}
        secundario={inicial(marca.secundario)}
      />
      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar colores
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
