import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { CLASES_DE_ETIQUETA, CLASES_DE_FORMULARIO } from "@/shared/ui/estilos";
import { cambiarEscudoAction } from "./actions/cambiarEscudo.action";
import { CampoDeArchivoDeEscudo } from "./CampoDeArchivoDeEscudo";
import type { ClaveDeErrorDeEscudo } from "./mensajesDeMarca";
import { REQUISITOS_DE_ESCUDO } from "./requisitosDeEscudo";

const ID_DE_ARCHIVO = "escudo-archivo";
const ID_DE_AYUDA = "escudo-ayuda";

export { REQUISITOS_DE_ESCUDO };

type Props = {
  /** El rechazo que dejo la accion, si volvio con uno (S9). */
  error: ClaveDeErrorDeEscudo | undefined;
};

/**
 * El formulario del escudo (S6).
 *
 * Es un componente del servidor con un `<form action>` nativo: sin
 * JavaScript el navegador hace el POST entero, con el archivo adentro, y la
 * pagina vuelve pintada por el `redirect` de la accion. El `method` y el
 * `multipart/form-data` no se escriben a mano porque React los pone cuando el
 * `action` es una funcion —y avisa si ademas se los pasa: «React provides
 * those automatically», `react-dom-server.node.development.js:2332` en
 * 19.2.8—. Antes era una hoja cliente que armaba el `FormData` a mano en un
 * `onSubmit`, y sin JavaScript ese envio se perdia en un GET sin archivo ni
 * mensaje (E1).
 *
 * El precio es que la accion ya no puede devolver un `ActionResult` que
 * alguien lea: el rechazo viaja como codigo en la URL y el texto sale de
 * `mensajesDeMarca.ts`, asi que es el mismo con y sin JavaScript. Como la
 * respuesta es una navegacion nueva, el campo vuelve vacio: el archivo
 * rechazado no queda elegido (S9).
 *
 * El campo es la unica hoja cliente (`CampoDeArchivoDeEscudo`), y no envuelve
 * la accion: agrega el rechazo por peso que el servidor no puede dar porque
 * el archivo ni llega —el transporte corta en 2 MB—.
 */
export function FormularioDeEscudo({ error }: Props) {
  return (
    <form action={cambiarEscudoAction} className={CLASES_DE_FORMULARIO}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ID_DE_ARCHIVO} className={CLASES_DE_ETIQUETA}>
          Escudo del ayuntamiento
        </label>
        <p id={ID_DE_AYUDA} className="text-[13px] text-caliza-apagada">
          {REQUISITOS_DE_ESCUDO}
        </p>
        <CampoDeArchivoDeEscudo
          idDeArchivo={ID_DE_ARCHIVO}
          idDeAyuda={ID_DE_AYUDA}
          error={error}
        />
      </div>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar escudo
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
