import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { contextoActual } from "@/shared/auth";
import { leerMarca } from "@/shared/marca";
import { CABECERA_RUTA } from "@/shared/tenancy/cabeceras";
import {
  exigirAyuntamiento,
  superficieActual,
} from "@/shared/tenancy/contexto";
import { BotonDeCerrarSesion } from "@/shared/ui/BotonDeCerrarSesion";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import { variablesDeMarca } from "@/shared/ui/marca";
import { BloqueDeMunicipio } from "./BloqueDeMunicipio";
import { NavegacionDeModulos } from "./NavegacionDeModulos";
import { NavegacionInferior } from "./NavegacionInferior";

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
 *
 * **La marca se inyecta aca tambien, no solo en `(acceso)`.** Hasta ahora
 * no lo hacia: el municipio veia su color en la pantalla de login y a
 * partir del primer clic el rojo por defecto de `globals.css`. En el
 * servidor y en el `style` del contenedor, por lo mismo que explica
 * `(acceso)/layout.tsx` —aplicadas despues de hidratar, la marca correcta
 * llega medio segundo tarde y se ve barato.
 *
 * El rol y cerrar sesion viven una sola vez por ancho: al pie del lateral
 * en escritorio y dentro de "Mas" en el movil. Ni la sesion trae el nombre
 * de la persona ni este layout lo pide: solo el rol.
 */
export default async function LayoutDePanel({
  children,
}: {
  children: ReactNode;
}) {
  const superficie = await superficieActual();

  if (superficie !== "ayuntamiento") notFound();

  const ayuntamiento = await exigirAyuntamiento();
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const marca = leerMarca(ayuntamiento.marca);
  const rol = etiquetaDeRol(contexto.usuario.rol);
  // La escribe el proxy con la ruta real del request; el cliente no la
  // controla (se sobreescribe siempre), igual que las de superficie.
  const ruta = (await headers()).get(CABECERA_RUTA) ?? "";

  const pie = (
    <div className="flex flex-col gap-1 [&_button]:w-full [&_button]:justify-start">
      <span className="px-3 text-[13px] font-medium text-caliza-apagada">
        {rol}
      </span>
      <BotonDeCerrarSesion />
    </div>
  );

  return (
    <div
      className="min-h-dvh bg-caliza-fondo lg:grid lg:grid-cols-[264px_1fr]"
      style={variablesDeMarca(marca)}
    >
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-caliza-divisor bg-caliza-lienzo lg:flex">
        <BloqueDeMunicipio nombre={ayuntamiento.nombre} escudo={marca.escudo} />
        <div className="flex-1">
          <NavegacionDeModulos ruta={ruta} rol={contexto.usuario.rol} />
        </div>
        <div className="border-t border-caliza-divisor p-3">{pie}</div>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-caliza-divisor lg:hidden">
          <BloqueDeMunicipio
            nombre={ayuntamiento.nombre}
            escudo={marca.escudo}
          />
        </div>
        <div className="pb-24 lg:pb-0">{children}</div>
      </div>

      <NavegacionInferior ruta={ruta} rol={contexto.usuario.rol}>
        {pie}
      </NavegacionInferior>
    </div>
  );
}
