import { Boton, Campo, CampoDeLista } from "@/shared/ui";
import type { TipoDeLugar } from "../domain";
import { altaDeLugarAction } from "./actions/altaDeLugarAction";
import { opcionesDeTipos } from "./opciones";
import { tiposParaElAlta } from "./tiposDelAlta";

type Props = {
  /**
   * Contexto del arbol para volver a el tras la accion. Sin `raiz`/`nodo`
   * el formulario es el de la entrada de `/territorio`, que crea un
   * asentamiento del municipio.
   */
  raiz?: string;
  nodo?: string;
  /** El padre del lugar nuevo: el nodo seleccionado. Ausente = raiz nueva. */
  padreId?: string;
  /** El tipo del padre, para ofrecer solo lo que ese padre puede contener. */
  tipoDelPadre?: TipoDeLugar;
  /** El municipio ya tiene su cabecera: sin padre, deja de ofrecerse. */
  hayCabecera?: boolean;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions).
 *
 * **Solo ofrece tipos que van a pasar la validacion.** Antes ofrecia los
 * cinco siempre: elegir "comisaria" dentro de una cabecera era un camino
 * abierto que terminaba en `JerarquiaInvalidaError` despues de enviar, y
 * dejar el padre vacio permitia crear una manzana suelta como raiz del
 * municipio -que el comentario de `tipoDeLugar.ts` ya declaraba imposible
 * sin que nada lo hiciera cumplir-.
 *
 * Sin padre, los tipos son los de rango 0 (`puedeSerRaiz`), sin la cabecera
 * si ya existe. Con padre, los que `tiposContenidosPor` deja pasar
 * (`tiposParaElAlta`). El caso de uso vuelve a validar de
 * todos modos: esconder una opcion no es una regla (`05-seguridad.md`
 * seccion 6, mismo criterio que los botones por rol).
 *
 * Sin titulo propio: lo pone el `Panel` que lo envuelve.
 */
export function FormularioDeAltaDeLugar({
  raiz,
  nodo,
  padreId,
  tipoDelPadre,
  hayCabecera = false,
}: Props) {
  const tipos = tiposParaElAlta({
    hayCabecera,
    ...(tipoDelPadre ? { tipoDelPadre } : {}),
  });

  return (
    <form action={altaDeLugarAction} className="flex flex-col gap-4">
      {raiz ? <input type="hidden" name="raiz" value={raiz} /> : null}
      {nodo ? <input type="hidden" name="nodo" value={nodo} /> : null}
      <input type="hidden" name="vista" value="lugares" />
      <input type="hidden" name="accion" value="lugar" />
      {padreId ? <input type="hidden" name="padreId" value={padreId} /> : null}

      <CampoDeLista
        id="lugar-tipo"
        name="tipo"
        etiqueta="Tipo"
        marcador="Seleccione un tipo"
        opciones={opcionesDeTipos(tipos)}
        {...(tipoDelPadre
          ? {}
          : {
              ayuda:
                "Cabecera es el pueblo; comisaria, cada asentamiento rural. Lo de adentro se agrega entrando al lugar.",
            })}
      />

      <Campo id="lugar-nombre" name="nombre" etiqueta="Nombre" required />

      <Boton type="submit" variante="primaria">
        Dar de alta
      </Boton>
    </form>
  );
}
