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
 */
export function FormularioDeEmision({
  personaId,
  nombreCompleto,
  direccion,
}: Props) {
  return (
    <form action={emitirConstanciaAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Constancia de vecindad
      </h2>
      <input type="hidden" name="personaId" value={personaId} />
      <p className="text-[15px] text-caliza-tinta">{nombreCompleto}</p>
      {direccion ? (
        <div className="flex flex-col gap-1">
          <p className="text-[15px] text-caliza-tinta">{direccion.texto}</p>
          <p className="text-[13px] text-caliza-apagada">
            Reside desde el {direccion.desdeEn}. El sistema no aplica un periodo
            minimo: verifique la fecha antes de confirmar.
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-senial-error">
          No hay una residencia vigente registrada para esta persona.
        </p>
      )}
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Emitir
      </button>
    </form>
  );
}
