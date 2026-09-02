import { Migaja, type Pestana, Pestanas } from "@/shared/ui";
import type { LugarId, TipoDeLugar } from "../domain";

/**
 * `tipo` es `TipoDeLugar` y no `string`: los dos origenes que lo arman
 * -`lugarPorId` y el subarbol- ya lo tienen tipado, y ensancharlo aca
 * dejaba a la pestana Lugares sin poder preguntar que puede contener.
 */
export type NodoSeleccionado = {
  id: LugarId;
  tipo: TipoDeLugar;
  nombre: string;
};

/** Un paso de la migaja: la raiz, un ancestro, o el nodo mismo. */
export type PasoDeMigaja = { id: LugarId; nombre: string };

export type AccionDeNodo =
  | "lugar"
  | "calle"
  | "renombrarCalle"
  | "domicilio"
  | "renombrar"
  | "baja"
  | "reparentear";

/** La pestana que categoriza el contenido: una sola se ve a la vez. */
export type TabDeLugar = "lugares" | "calles" | "domicilios" | "editar";

/** Cuantos hay adentro de cada categoria, para escribirlo en la pestana. */
export type CuentasDeLugar = {
  lugares: number;
  calles: number;
  domicilios: number;
};

type Props = {
  raizId: LugarId;
  nodo: NodoSeleccionado;
  /** La migaja completa, de la raiz al nodo. Los pasos previos son links. */
  migaja: readonly PasoDeMigaja[];
  /** La pestana activa: la unica categoria visible. */
  vista: TabDeLugar;
  cuentas: CuentasDeLugar;
  /** La guarda fina la hace cada caso de uso; aca solo se esconde Editar. */
  puedeActuar: boolean;
};

/**
 * La cabecera del lugar actual: migaja, nombre y las pestanas que separan
 * su contenido.
 *
 * Las pestanas llevan la cuenta de lo que tienen adentro, y eso es lo que
 * las vuelve una respuesta en vez de una pregunta: sin el numero, saber si
 * un lugar tiene calles cargadas obligaba a entrar a la pestana, y despues
 * volver. Con cuatro pestanas eran cuatro viajes por lugar.
 *
 * "Editar" no lleva cuenta a proposito: no es una categoria de contenido,
 * es lo que se le hace al lugar mismo.
 *
 * Plana, sin caja: la jerarquia la dan la tipografia y la linea de
 * pestanas, no un borde alrededor.
 */
export function PanelDeNodo({
  raizId,
  nodo,
  migaja,
  vista,
  cuentas,
  puedeActuar,
}: Props) {
  const ultimo = migaja[migaja.length - 1];
  const pasos = [
    { etiqueta: "Lugares", href: "/territorio" },
    ...migaja.map((paso) => ({
      etiqueta: paso.nombre,
      ...(paso.id === ultimo?.id
        ? {}
        : { href: `/territorio?raiz=${raizId}&nodo=${paso.id}` }),
    })),
  ];

  const pestanas: readonly Pestana[] = [
    {
      clave: "lugares",
      etiqueta: "Lugares",
      cuenta: cuentas.lugares,
      href: `/territorio?raiz=${raizId}&nodo=${nodo.id}&vista=lugares`,
      activa: vista === "lugares",
    },
    {
      clave: "calles",
      etiqueta: "Calles",
      cuenta: cuentas.calles,
      href: `/territorio?raiz=${raizId}&nodo=${nodo.id}&vista=calles`,
      activa: vista === "calles",
    },
    {
      clave: "domicilios",
      etiqueta: "Domicilios",
      cuenta: cuentas.domicilios,
      href: `/territorio?raiz=${raizId}&nodo=${nodo.id}&vista=domicilios`,
      activa: vista === "domicilios",
    },
    ...(puedeActuar
      ? [
          {
            clave: "editar",
            etiqueta: "Editar",
            href: `/territorio?raiz=${raizId}&nodo=${nodo.id}&vista=editar`,
            activa: vista === "editar",
          },
        ]
      : []),
  ];

  return (
    <section
      aria-labelledby="panel-nodo-nombre"
      className="flex flex-col gap-3"
    >
      <Migaja pasos={pasos} etiqueta="Ubicacion" />
      <div className="flex flex-wrap items-baseline gap-2">
        <h2
          id="panel-nodo-nombre"
          className="text-[19px] font-semibold text-caliza-tinta"
        >
          {nodo.nombre}
        </h2>
        <span className="text-[13px] text-caliza-apagada">{nodo.tipo}</span>
      </div>
      <Pestanas pestanas={pestanas} etiqueta="Contenido del lugar" />
    </section>
  );
}
