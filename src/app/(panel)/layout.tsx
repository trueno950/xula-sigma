import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { contextoActual } from "@/shared/auth";
import { CABECERA_SUPERFICIE } from "@/shared/tenancy/cabeceras";

/**
 * Layout de las pantallas que necesitan sesion.
 *
 * `(acceso)` es el grupo del login: su pagina raiz redirige a quien YA
 * tiene sesion. Este grupo es lo opuesto —redirige a quien NO la tiene— y
 * es el que `module-template.md` ya documenta como destino de las rutas
 * de modulo (`app/(panel)/<modulo>/...`). Colgar una pantalla que exige
 * sesion del grupo de login habria heredado en el nombre una semantica que
 * no le corresponde, aunque el layout de `(acceso)` no la fuerce por
 * codigo.
 *
 * Repite la guarda de superficie de `(acceso)/layout.tsx` por la misma
 * razon que esa: sin ella, un request a `xulasigma.mx` (superficie `raiz`,
 * sin tenant) haria que `contextoActual()` intentara resolver un
 * ayuntamiento inexistente, y el 500 resultante delataria que ahi adentro
 * hay algo que espera un tenant.
 */
export default async function LayoutDePanel({
  children,
}: {
  children: ReactNode;
}) {
  const superficie = (await headers()).get(CABECERA_SUPERFICIE);

  if (superficie !== "ayuntamiento") notFound();

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  return <>{children}</>;
}
