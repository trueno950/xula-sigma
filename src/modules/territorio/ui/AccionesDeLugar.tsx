import { CLASES_DE_TARJETA } from "@/shared/ui";
import { puedeTenerCatalogoDeCalles, type TipoDeLugar } from "../domain";
import type { EstadoDeAccion } from "./bloqueosDeLugar";
import { type PropsDeContenido, rutaDe } from "./contenido";
import {
  type ClaveDeEdicion,
  domiciliosDe,
  estadosDeEdicion,
  padreDe,
} from "./estadosDeEdicion";
import { FormularioDeBajaDeLugar } from "./FormularioDeBajaDeLugar";
import { FormularioDeEdicionDeLugar } from "./FormularioDeEdicionDeLugar";
import { FormularioDeReparenteo } from "./FormularioDeReparenteo";
import type { CuentasDeLugar } from "./PanelDeNodo";
import { PieDeFormulario } from "./PieDeFormulario";
import { ACCIONES_DE_LUGAR, PliegueDeEdicion } from "./PliegueDeEdicion";
import { puedeAbrir } from "./permisos";
import { admiteLugares } from "./vistaDePanel";

/** Solo lo que las acciones del lugar miran: el resto de la pantalla no. */
type Props = Pick<
  PropsDeContenido,
  | "raizId"
  | "lugar"
  | "nodos"
  | "calles"
  | "lugares"
  | "conteos"
  | "zonasDelLugar"
  | "accion"
  | "permisos"
> & { cuentas: CuentasDeLugar };

const cantidad = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/**
 * La linea que resume el lugar: cuantas colonias, calles y domicilios tiene
 * adentro. Solo nombra lo que el tipo puede tener -una colonia no contiene
 * colonias ni tiene catalogo de calles-, asi que un cero ahi nunca aparece.
 */
export const resumenDeLugar = ({
  tipo,
  cuentas,
}: {
  tipo: TipoDeLugar;
  cuentas: CuentasDeLugar;
}): string =>
  [
    ...(admiteLugares(tipo)
      ? [cantidad(cuentas.lugares, "colonia", "colonias")]
      : []),
    ...(puedeTenerCatalogoDeCalles(tipo)
      ? [cantidad(cuentas.calles, "calle", "calles")]
      : []),
    ...(cuentas.domicilios === undefined
      ? []
      : [cantidad(cuentas.domicilios, "domicilio", "domicilios")]),
  ].join(" · ");

/** El motivo en lugar del formulario, con la salida de siempre. */
function MotivoEnLugarDelFormulario({
  motivo,
  volverA,
}: {
  motivo: string;
  volverA: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-caliza-tinta">{motivo}</p>
      <PieDeFormulario volverA={volverA} />
    </div>
  );
}

/** El formulario nativo de cada accion, o el motivo que la frena. */
function cuerpoDeLaAccion(
  clave: ClaveDeEdicion,
  estado: EstadoDeAccion,
  { props, volverA }: { props: Props; volverA: string },
) {
  if (estado.clase === "bloqueada") {
    return (
      <MotivoEnLugarDelFormulario motivo={estado.motivo} volverA={volverA} />
    );
  }

  const { raizId, lugar, nodos, lugares } = props;
  if (clave === "renombrar") {
    return (
      <FormularioDeEdicionDeLugar
        raiz={raizId}
        nodo={lugar.id}
        nombreActual={lugar.nombre}
        volverA={volverA}
      />
    );
  }
  if (clave === "reparentear") {
    return (
      <FormularioDeReparenteo
        raiz={raizId}
        nodo={lugar.id}
        tipoDelLugar={lugar.tipo}
        lugares={lugares}
        padre={padreDe(nodos, lugar.id)}
        volverA={volverA}
        domicilios={domiciliosDe(props)}
      />
    );
  }

  return (
    <FormularioDeBajaDeLugar
      raiz={raizId}
      nodo={lugar.id}
      padre={padreDe(nodos, lugar.id)}
      nombre={lugar.nombre}
      volverA={volverA}
    />
  );
}

/**
 * S3 de `odd/tasks/territorio-ux.md`: renombrar, mover y dar de baja dejan
 * de ser la pestana «Editar» -que parecia una categoria de contenido mas- y
 * pasan a un acordeon de la cabecera. Cada pliegue contiene su formulario
 * nativo, sin `"use client"` de por medio: los tres son POST del navegador y
 * las acciones y su redaccion de errores no cambiaron.
 *
 * Que se ofrece no lo decide este archivo: `estadosDeEdicion` ya sabe que
 * esta bloqueado por dependencias y `puedeAbrir` repite el permiso del caso
 * de uso, para no ofrecer un camino que termina en `NoAutorizadoError`.
 */
export function AccionesDeLugar(props: Props) {
  const { raizId, lugar, accion, permisos, cuentas } = props;
  const estados = estadosDeEdicion(props);
  const disponibles = ACCIONES_DE_LUGAR.filter(
    (item) =>
      puedeAbrir(item.clave, permisos) &&
      estados[item.clave].clase !== "oculta",
  );
  const volverA = rutaDe({ raizId, nodoId: lugar.id, vista: "lugares" });

  return (
    <section
      aria-label={`Acciones de ${lugar.nombre}`}
      className={`flex flex-col gap-3 ${CLASES_DE_TARJETA}`}
    >
      <p className="text-[15px] text-caliza-apagada">
        {resumenDeLugar({ tipo: lugar.tipo, cuentas })}
      </p>

      {disponibles.length > 0 ? (
        <div className="flex flex-wrap items-start gap-2">
          {disponibles.map((item) => (
            <PliegueDeEdicion
              key={item.clave}
              item={item}
              abierto={accion === item.clave}
            >
              {cuerpoDeLaAccion(item.clave, estados[item.clave], {
                props,
                volverA,
              })}
            </PliegueDeEdicion>
          ))}
        </div>
      ) : null}
    </section>
  );
}
