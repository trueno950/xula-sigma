import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CABECERA_SUPERFICIE } from "@/shared/tenancy/cabeceras";
import { ayuntamientoActual } from "@/shared/tenancy/contexto";
import { leerMarca, variablesDeMarca } from "@/shared/ui/marca";

/**
 * Layout de la superficie de un municipio.
 *
 * **Solo existe en un subdominio de municipio.** `proxy.ts` distingue tres
 * superficies —`raiz`, `admin` y `ayuntamiento`— y estas paginas son de la
 * ultima. En `xulasigma.mx/acceso`, sin municipio, no hay pantalla de
 * acceso que servir: es 404, no un error.
 *
 * Lo encontro el E2E. Sin esta guarda, la raiz respondia **500** porque
 * `ayuntamientoActual()` lanzaba `TenantNoResueltoError` desde el layout —y
 * un 500 en una superficie publica delata que ahi adentro hay algo que
 * espera un tenant.
 *
 * La marca se inyecta aca y no en el layout raiz por lo mismo: por la raiz
 * pasan las tres superficies y solo esta tiene un ayuntamiento del que
 * hablar. Resolver el tenant alla obligaria a inventarle uno, que es lo que
 * el invariante 1 prohibe.
 *
 * En el servidor, en el `style` del contenedor. Aplicadas despues de
 * hidratar, el municipio ve medio segundo la marca por defecto y despues
 * cambia; se ve barato, y en una demo frente a un tesorero eso importa.
 */
export default async function LayoutDeAcceso({
  children,
}: {
  children: ReactNode;
}) {
  const superficie = (await headers()).get(CABECERA_SUPERFICIE);

  if (superficie !== "ayuntamiento") notFound();

  const { marca } = await ayuntamientoActual();

  return (
    <div
      className="min-h-dvh bg-neutral-50"
      style={variablesDeMarca(leerMarca(marca))}
    >
      {children}
    </div>
  );
}
