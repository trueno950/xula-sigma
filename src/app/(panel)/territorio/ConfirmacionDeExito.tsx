import Link from "next/link";
import type { ClaveDeConfirmacion } from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import { EnlaceVolverAFicha } from "@/modules/territorio/ui/EnlaceVolverAFicha";
import { etiquetaDeTipo } from "@/modules/territorio/ui/etiquetaDeTipo";
import { regresoValido } from "@/modules/territorio/ui/regresoAFicha";
import { Aviso, CLASES_DE_ENLACE } from "@/shared/ui";
import { MENSAJE_DE_CONFIRMACION } from "./mensajeDeConfirmacion";

type Lugar = Pick<LugarGuardado, "id" | "nombre" | "tipo" | "padreId">;

/** El mismo cinturon `profundidad < 8` de las consultas de subarbol. */
const NIVEL_MAXIMO = 8;

/**
 * La vista del lugar: su raiz va en `?raiz=` y el, si no es la raiz, en
 * `?nodo=`. Sin cadena completa hasta una raiz no hay destino seguro.
 */
const destinoDe = (lugar: Lugar, lugares: readonly Lugar[]) => {
  let raiz: Lugar | undefined = lugar;

  for (let nivel = 0; raiz?.padreId && nivel < NIVEL_MAXIMO; nivel++) {
    const padreId: string = raiz.padreId;
    raiz = lugares.find((otro) => otro.id === padreId);
  }

  if (!raiz || raiz.padreId) return null;

  return raiz.id === lugar.id
    ? `/territorio?raiz=${lugar.id}`
    : `/territorio?raiz=${raiz.id}&nodo=${lugar.id}`;
};

/**
 * El aviso de `?ok=`. Tras el alta de un lugar enlaza al que se creo: el id
 * viene de `?nuevo=`, pero el nombre y el destino salen de `lugares`, que la
 * pagina ya leyo bajo RLS, nunca de la URL. Un id que no esta ahi deja el
 * mensaje de siempre.
 *
 * El `?regreso=` solo acompaña a `domicilio-corregido`: quien corrigio la
 * direccion desde la ficha de una persona se queda en el arbol y vuelve a
 * ella por este enlace, otra vez validado. Se descarta en silencio para las
 * demas confirmaciones, porque ninguna otra se pidio desde una ficha.
 */
export function ConfirmacionDeExito({
  ok,
  nuevo,
  lugares,
  regreso,
}: {
  ok: ClaveDeConfirmacion;
  nuevo: string | undefined;
  lugares: readonly Lugar[];
  /** El `?regreso=` de la URL; ver `regresoAFicha.ts`. */
  regreso?: string | undefined;
}) {
  const creado =
    ok === "lugar-creado" && nuevo
      ? lugares.find((lugar) => lugar.id === nuevo)
      : undefined;
  const destino = creado ? destinoDe(creado, lugares) : null;
  const vuelta =
    ok === "domicilio-corregido" ? regresoValido(regreso) : undefined;

  if (creado && destino) {
    // Femenino para los tres tipos; ver `tituloDelAlta` (`tiposDelAlta.ts`).
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Aviso tono="exito">
          {`${etiquetaDeTipo(creado.tipo)} agregada. Puede seguir agregando otra.`}
        </Aviso>
        <Link href={destino} className={`rounded-sm ${CLASES_DE_ENLACE}`}>
          {`Ver ${creado.nombre}`}
        </Link>
      </div>
    );
  }

  const mensaje = <Aviso tono="exito">{MENSAJE_DE_CONFIRMACION[ok]}</Aviso>;

  return vuelta ? (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {mensaje}
      <EnlaceVolverAFicha regreso={vuelta} />
    </div>
  ) : (
    mensaje
  );
}
