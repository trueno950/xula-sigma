import { headers } from "next/headers";
import Link from "next/link";
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
import { NavegacionDeModulos } from "./NavegacionDeModulos";

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

  return (
    <div className="min-h-dvh bg-caliza-lienzo" style={variablesDeMarca(marca)}>
      <header className="flex min-h-16 flex-col items-stretch justify-between gap-3 border-b border-caliza-divisor bg-caliza-lienzo px-3 py-3 md:sticky md:top-0 md:z-10 md:h-16 md:flex-row md:items-center md:gap-4 md:px-6 md:py-0">
        <Link
          href="/padron"
          aria-label={`${ayuntamiento.nombre}, Xula Sigma`}
          title={ayuntamiento.nombre}
          className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          {marca.escudo ? (
            // `next/image` exigiria declarar el host de R2 en
            // `remotePatterns`, y el escudo lo sube cada municipio a una
            // URL que la plataforma no elige. 40px de alto, sin recorte.
            // biome-ignore lint/performance/noImgElement: host externo por municipio
            <img
              src={marca.escudo}
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />
          ) : null}
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="break-words text-[15px] font-semibold text-caliza-tinta md:truncate">
              {ayuntamiento.nombre}
            </span>
            {/*
              Sin `uppercase`: la mayuscula sostenida es la firma del
              tramite de gobierno, que es la anti-referencia declarada del
              producto (`DESIGN.md`, Don't). El nombre de la plataforma va
              debajo del municipio y en tono apagado porque el municipio es
              quien atiende; nosotros somos la herramienta.
            */}
            <span className="text-[12px] tracking-wide text-caliza-apagada">
              Xula Sigma
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-3">
          <span className="text-[13px] text-caliza-apagada">{rol}</span>
          <BotonDeCerrarSesion />
        </div>
      </header>

      <div className="md:grid md:grid-cols-[15rem_1fr] md:items-start">
        {/*
         * Mismo fondo que el lienzo y separada por una linea, no por un
         * tono propio (`DESIGN.md`, Elevation): una barra de otro color
         * parte la pantalla en dos mundos y el contenido deja de ser el
         * centro.
         */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-r border-caliza-divisor md:block">
          <NavegacionDeModulos ruta={ruta} forma="barra" />
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-10 bg-caliza-lienzo md:hidden">
            <NavegacionDeModulos ruta={ruta} forma="fila" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
