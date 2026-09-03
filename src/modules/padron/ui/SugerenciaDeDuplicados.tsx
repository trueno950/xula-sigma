"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { CLASES_DE_ETIQUETA, clasesDeCampo } from "@/shared/ui";
import {
  type SugerenciaDeDuplicado,
  sugerirDuplicadosAction,
} from "./actions/sugerirDuplicados.action";
import {
  ID_DE_LISTA,
  idDeOpcion,
  ListaDeSugerencias,
} from "./ListaDeSugerencias";
import { planDeConsulta } from "./planDeConsulta";

const RETARDO_MS = 300;

/**
 * Unica hoja `"use client"` de la rebanada 4 (tasks.md 4.25): mostrar
 * sugerencias mientras se escribe necesita estado de cliente, y no existe
 * forma de pedirselo a un Server Component.
 *
 * Reemplaza los campos `nombres`/`primerApellido` de
 * `FormularioDeAltaDePersona` en vez de vivir al lado: los dos siguen
 * llevando su `name` nativo, asi que el `<form action>` que los envuelve
 * los sigue leyendo igual al enviar.
 *
 * **Es el componente de firma de `DESIGN.md`, y lo que lo define es lo que
 * NO hace.** No roba el foco: la opcion marcada se anuncia con
 * `aria-activedescendant` y el cursor nunca sale del campo. No frena el
 * envio: no hay estado "confirme que no es duplicado", y la operadora
 * puede escribir hasta el final y guardar sin mirar la lista. Una
 * validacion que bloquea manda el tramite al papel, y el papel no tiene
 * RLS ni bitacora.
 *
 * La marca es la senal de aviso **mas la palabra "posible duplicado"**,
 * nunca solo el color: la marca del municipio puede ser de ese mismo tono.
 */
export function SugerenciaDeDuplicados() {
  const [nombres, setNombres] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [sugerencias, setSugerencias] = useState<
    readonly SugerenciaDeDuplicado[]
  >([]);
  /** -1 es "ninguna marcada", que es el estado en el que se escribe. */
  const [activa, setActiva] = useState(-1);
  /** La cierra Escape. Vuelve a abrirse en cuanto cambia lo escrito. */
  const [cerrada, setCerrada] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const idDeConsulta = useRef(0);
  const idDeRetardo = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Sin esta limpieza, una consulta pendiente disparaba despues de enviar
  // el formulario: el timer vencia cuando el router ya habia navegado a
  // otra ruta y el POST llegaba ahi con un id de accion que no le
  // pertenecia — 404 "This page could not be found".
  useEffect(() => {
    return () => clearTimeout(idDeRetardo.current);
  }, []);

  const consultar = (nombresNuevo: string, apellidoNuevo: string) => {
    clearTimeout(idDeRetardo.current);
    setCerrada(false);
    setActiva(-1);
    // La lista se vacia en cuanto cambia lo escrito, no cuando llega la
    // respuesta. Entre el tecleo y el retardo quedaban visibles y
    // seleccionables las personas de la consulta anterior, que ya no son
    // las parecidas a lo que hay en el formulario.
    setSugerencias([]);

    const plan = planDeConsulta(
      nombresNuevo,
      apellidoNuevo,
      () => ++idDeConsulta.current,
    );

    if (plan.tipo === "limpiar") return;

    idDeRetardo.current = setTimeout(async () => {
      // La accion ya atrapa sus propios errores y devuelve `[]`; este
      // catch es para el rechazo de red -conexion caida a mitad del
      // pedido-, que nunca llega a ejecutar la accion en el servidor.
      const encontradas = await sugerirDuplicadosAction(plan.cadena).catch(
        () => [] as const,
      );
      // Ignora una respuesta que ya no es la ultima tecla escrita: sin
      // esto, una respuesta lenta de una consulta vieja puede llegar
      // despues de una mas nueva y pisar sugerencias correctas con unas
      // desactualizadas.
      if (plan.id === idDeConsulta.current) setSugerencias(encontradas);
    }, RETARDO_MS);
  };

  const abierta = sugerencias.length > 0 && !cerrada;

  /**
   * Las flechas recorren la lista sin sacar el cursor del campo y Enter
   * abre la ficha marcada en otra pestana — la unica forma de descartar un
   * homonimo es mirar su registro, y hacerlo en la misma pestana perderia
   * lo escrito. Enter sin nada marcado no se toca: envia el formulario,
   * como en cualquier campo.
   */
  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (!abierta) return;

    if (evento.key === "Escape") {
      setCerrada(true);
      setActiva(-1);
      return;
    }

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActiva((previa) => (previa + 1) % sugerencias.length);
      return;
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActiva((previa) =>
        previa <= 0 ? sugerencias.length - 1 : previa - 1,
      );
      return;
    }

    if (evento.key === "Enter" && activa >= 0) {
      const persona = sugerencias[activa];
      if (!persona) return;

      evento.preventDefault();
      window.open(`/padron/${persona.id}`, "_blank", "noopener");
    }
  };

  const propsDeCampo = {
    type: "text" as const,
    required: true,
    autoComplete: "off",
    role: "combobox" as const,
    "aria-expanded": abierta,
    "aria-controls": ID_DE_LISTA,
    "aria-autocomplete": "list" as const,
    ...(activa >= 0 ? { "aria-activedescendant": idDeOpcion(activa) } : {}),
    className: clasesDeCampo(),
    onKeyDown: alTeclear,
    onFocus: () => setCerrada(false),
    /**
     * La lista se cierra cuando el foco sale del grupo: flota sobre
     * "Segundo apellido", y dejarla abierta mientras la operadora ya esta
     * escribiendo ahi le tapa el campo en el que esta. `relatedTarget` es a
     * donde va el foco: si sigue adentro —el enlace de una fila, el otro
     * campo— no se cierra nada.
     */
    onBlur: (evento: FocusEvent<HTMLInputElement>) => {
      if (!contenedor.current?.contains(evento.relatedTarget)) setCerrada(true);
    },
  };

  return (
    <div ref={contenedor} className="relative flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={CLASES_DE_ETIQUETA}>Nombres</span>
        <input
          {...propsDeCampo}
          name="nombres"
          value={nombres}
          onChange={(evento) => {
            setNombres(evento.target.value);
            consultar(evento.target.value, primerApellido);
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASES_DE_ETIQUETA}>Primer apellido</span>
        <input
          {...propsDeCampo}
          name="primerApellido"
          value={primerApellido}
          onChange={(evento) => {
            setPrimerApellido(evento.target.value);
            consultar(nombres, evento.target.value);
          }}
        />
      </label>

      {abierta ? (
        <ListaDeSugerencias sugerencias={sugerencias} activa={activa} />
      ) : null}
    </div>
  );
}
