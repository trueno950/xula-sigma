import Link from "next/link";
import { ANILLO_DE_FOCO } from "@/shared/ui";
import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";

type Props = {
  raizId: LugarId;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre">[];
};

const ENLACE = `rounded-sm text-caliza-tinta underline underline-offset-2 ${ANILLO_DE_FOCO}`;

export function CatalogoHeredado({ raizId, lugares }: Props) {
  const asentamiento =
    lugares.find((lugar) => lugar.id === raizId)?.nombre ?? "su asentamiento";
  const hrefDelCatalogo = rutaDe({
    raizId,
    nodoId: raizId,
    vista: "calles",
  });

  return (
    <Link href={hrefDelCatalogo} className={ENLACE}>
      Ver el catálogo de calles de {asentamiento}
    </Link>
  );
}
