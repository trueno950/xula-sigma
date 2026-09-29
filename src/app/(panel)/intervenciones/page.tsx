import type { Metadata } from "next";
import { PaginaDePanel } from "@/shared/ui";

export const metadata: Metadata = { title: "Intervenciones" };

export default function PaginaDeIntervenciones() {
  return (
    <PaginaDePanel titulo="Intervenciones">
      <p className="max-w-prose text-[15px] text-caliza-apagada">
        La bandeja de intervenciones todavia no esta disponible.
      </p>
    </PaginaDePanel>
  );
}
