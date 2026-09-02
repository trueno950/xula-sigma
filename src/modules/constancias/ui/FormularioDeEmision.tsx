import { Aviso, Boton, CLASES_DE_ETIQUETA } from "@/shared/ui";
import { emitirConstanciaAction } from "./actions/emitirConstanciaAction";

type Props = {
  personaId: string;
  nombreCompleto: string;
  direccion: { texto: string; desdeEn: string } | null;
};

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="flex flex-col gap-1">
    <span className={CLASES_DE_ETIQUETA}>{etiqueta}</span>
    <span className="text-[15px] text-caliza-tinta">{valor}</span>
  </div>
);

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

      <div className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
        <h2 className="text-[15px] font-semibold text-caliza-tinta">
          Constancia de vecindad
        </h2>

        <Dato etiqueta="Titular" valor={nombreCompleto} />

        {direccion ? (
          <>
            <Dato etiqueta="Direccion" valor={direccion.texto} />
            <div className="flex flex-col gap-1">
              <span className={CLASES_DE_ETIQUETA}>Reside desde</span>
              <span className="font-mono text-[15px] text-caliza-tinta">
                {direccion.desdeEn}
              </span>
              <span className="text-[13px] text-caliza-apagada">
                El sistema no aplica un periodo minimo: verifique la fecha antes
                de confirmar.
              </span>
            </div>
          </>
        ) : (
          <Aviso tono="error">
            No hay una residencia vigente registrada para esta persona.
          </Aviso>
        )}
      </div>

      <Boton type="submit" variante="primaria">
        Emitir constancia
      </Boton>
    </form>
  );
}
