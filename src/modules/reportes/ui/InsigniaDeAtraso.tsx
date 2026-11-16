import { InsigniaDeEstado } from "@/shared/ui";

/** «Atrasado · N días», la insignia de S1 de `gestion-municipal`. */
export function InsigniaDeAtraso({ dias }: { dias: number }) {
  return (
    <span className="flex">
      <InsigniaDeEstado
        tono="error"
        etiqueta={`Atrasado · ${dias} ${dias === 1 ? "día" : "días"}`}
      />
    </span>
  );
}
