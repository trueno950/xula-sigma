import { fechaCivilCorta, hoyEnMerida } from "@/shared/lib/fecha";
import { duracionCivil } from "@/shared/lib/fecha/duracion";
import { Aviso, BarraDeAcciones, Boton } from "@/shared/ui";
import type { VistaPreviaDeConstancia } from "../application/vistaPreviaDeConstancia";
import { emitirConstanciaAction } from "./actions/emitirConstanciaAction";
import { HojaDeConstancia } from "./HojaDeConstancia";

type Props = {
  personaId: string;
  vista: VistaPreviaDeConstancia;
};

/**
 * El aviso de S6: dice cuanto tiempo lleva la persona en su domicilio para
 * que la operadora compruebe la fecha de un vistazo, y conserva la regla de
 * la spec «Sin periodo minimo de residencia como regla de sistema» —el
 * sistema MUST NOT bloquear por un periodo minimo, la fecha se muestra para
 * que el criterio lo aplique quien opera, no el software—.
 *
 * Sin duracion posible (una fecha de inicio futura o invalida) queda solo la
 * regla: el aviso nunca inventa un tiempo que el dato no dice.
 */
const AvisoDeResidencia = ({ desdeEn }: { desdeEn: string }) => {
  const duracion = duracionCivil(desdeEn, hoyEnMerida());
  const regla =
    "El sistema no aplica un periodo mínimo: verifique la fecha antes de confirmar.";

  return (
    <Aviso tono="aviso">
      {duracion
        ? `Reside ahí desde el ${fechaCivilCorta(desdeEn)}: ${duracion}. ${regla}`
        : regla}
    </Aviso>
  );
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions).
 *
 * Arriba del boton va la hoja que se va a imprimir (S5), armada con el mismo
 * componente que el detalle de una constancia emitida: el operador aprueba el
 * documento, no una lista de campos. Sin residencia vigente la hoja no se
 * puede armar y el formulario se sigue mostrando: quien rechaza la emision es
 * `emitirConstancia` (`SinResidenciaVigenteError`), no esta pantalla.
 */
export function FormularioDeEmision({ personaId, vista }: Props) {
  const { direccion, firmante, municipio, titular } = vista;

  return (
    <form action={emitirConstanciaAction} className="flex flex-col gap-5">
      <input type="hidden" name="personaId" value={personaId} />

      {direccion && firmante ? (
        <HojaDeConstancia datos={{ municipio, titular, direccion, firmante }} />
      ) : null}

      {direccion ? (
        <AvisoDeResidencia desdeEn={direccion.desdeEn} />
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
