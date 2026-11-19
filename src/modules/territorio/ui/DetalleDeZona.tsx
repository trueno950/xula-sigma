import {
  Aviso,
  Migaja,
  PaginaDePanel,
  type Pestana,
  Pestanas,
} from "@/shared/ui";
import type { DomicilioDelRegistro } from "../application/puertosDeDomicilios";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import { AccionesDeZona } from "./AccionesDeZona";
import type { CalleParaZona } from "./FormulariosDeZona";
import { CallesDeLaZona, DomiciliosDeLaZona } from "./TablasDeZona";

type Props = {
  zona: ZonaGuardada;
  vista: "calles" | "domicilios";
  calles: readonly CalleParaZona[];
  domicilios: readonly DomicilioDelRegistro[];
  callesDelAsentamiento: readonly CalleParaZona[];
  error: string | undefined;
  aviso: string | undefined;
  /** Sin el, la zona se lee pero no se renombra, ni baja, ni se le cambian calles. */
  puedeAdministrar: boolean;
};

/**
 * El detalle de una zona: pestanas de URL (`?zona=&vista=`) con las calles
 * que la componen y los domicilios derivados de esas calles, nunca
 * declarados aparte (Rebanada B1). Renombre, baja y pertenencias son
 * formularios nativos; la zona no se elige por cliente, ya esta en la URL.
 *
 * **Cada fila abre lo que nombra** (ZD1, S11), y los dos listados viven en
 * `TablasDeZona.tsx`: la calle entra a su panel de Calles y el domicilio a
 * su ficha, con los mismos parametros que usa la entrada del territorio.
 * La fila con el formulario de quitar no puede ser un enlace -un `<form>`
 * adentro de un `<a>` es HTML invalido y el clic dispara las dos cosas-,
 * asi que ahi el enlace va en el nombre.
 */
export function DetalleDeZona({
  zona,
  vista,
  calles,
  domicilios,
  callesDelAsentamiento,
  error,
  aviso,
  puedeAdministrar,
}: Props) {
  const base = `/territorio/zonas?zona=${zona.id}`;
  const pestanas: readonly Pestana[] = [
    {
      clave: "calles",
      etiqueta: "Calles",
      href: `${base}&vista=calles`,
      activa: vista === "calles",
      cuenta: calles.length,
      etiquetaAccesible: `Calles de la zona, ${calles.length}`,
    },
    {
      clave: "domicilios",
      etiqueta: "Domicilios",
      href: `${base}&vista=domicilios`,
      activa: vista === "domicilios",
      cuenta: domicilios.length,
      etiquetaAccesible: `Domicilios derivados, ${domicilios.length}`,
    },
  ];

  return (
    <PaginaDePanel
      titulo={zona.nombre}
      etiqueta="Zona"
      descripcion={`Zona operativa de ${zona.asentamiento}.`}
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Territorio", href: "/territorio" },
            { etiqueta: "Zonas", href: "/territorio/zonas" },
            { etiqueta: zona.nombre },
          ]}
          etiqueta="Camino a la zona"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}

      {puedeAdministrar ? <AccionesDeZona zona={zona} /> : null}

      <Pestanas pestanas={pestanas} etiqueta="Vistas de la zona" />
      {vista === "calles" ? (
        <CallesDeLaZona
          zona={zona}
          calles={calles}
          callesDelAsentamiento={puedeAdministrar ? callesDelAsentamiento : []}
          puedeQuitar={puedeAdministrar}
        />
      ) : (
        <DomiciliosDeLaZona zona={zona} domicilios={domicilios} />
      )}
    </PaginaDePanel>
  );
}
