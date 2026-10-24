import { fechaCivilCorta } from "@/shared/lib/fecha";
import {
  Aviso,
  BarraDeAcciones,
  Boton,
  FichaDeDatos,
  FilaDeFicha,
} from "@/shared/ui";
import { emitirConstanciaAction } from "./actions/emitirConstanciaAction";

type Props = {
  personaId: string;
  nombreCompleto: string;
  direccion: { texto: string; desdeEn: string } | null;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). Muestra `desdeEn` de la residencia
 * vigente antes de confirmar -spec "Sin periodo minimo de residencia como
 * regla de sistema": el sistema MUST NOT bloquear por un periodo minimo,
 * MUST mostrar la fecha para que el criterio lo aplique quien opera, no el
 * software-. Sin residencia vigente el formulario se sigue mostrando: quien
 * rechaza la emision es `emitirConstancia` (`SinResidenciaVigenteError`),
 * no esta pantalla.
 *
 * Lo que se va a imprimir se lee como datos etiquetados, no como parrafos
 * sueltos: es una revision antes de firmar, y el operador tiene que poder
 * comparar cada valor con lo que tiene enfrente.
 */
export function FormularioDeEmision({
  personaId,
  nombreCompleto,
  direccion,
}: Props) {
  return (
    <form action={emitirConstanciaAction} className="flex flex-col gap-5">
      <input type="hidden" name="personaId" value={personaId} />

      <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        Constancia de vecindad
      </h2>

      <FichaDeDatos>
        <FilaDeFicha etiqueta="Titular">{nombreCompleto}</FilaDeFicha>
        {direccion ? (
          <>
            <FilaDeFicha etiqueta="Dirección">{direccion.texto}</FilaDeFicha>
            <FilaDeFicha etiqueta="Reside desde" dato>
              {fechaCivilCorta(direccion.desdeEn)}
            </FilaDeFicha>
          </>
        ) : null}
      </FichaDeDatos>

      {direccion ? (
        <p className="text-[13px] text-caliza-apagada">
          El sistema no aplica un periodo mínimo: verifique la fecha antes de
          confirmar.
        </p>
      ) : (
        <Aviso tono="error">
          No hay una residencia vigente registrada para esta persona.
        </Aviso>
      )}

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Emitir constancia
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
