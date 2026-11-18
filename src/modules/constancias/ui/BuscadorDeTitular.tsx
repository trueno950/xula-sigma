import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import {
  Boton,
  CeldaDeDato,
  CeldaPrincipal,
  CLASES_DE_ETIQUETA,
  type ColumnaDeTabla,
  clasesDeCampo,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  InsigniaDeEstado,
  Tabla,
} from "@/shared/ui";
import type {
  ResultadoDeBusquedaDeTitulares,
  TitularEncontrado,
} from "../application/buscarTitulares";

/**
 * La ayuda dice por que el campo y no un placeholder: al escribir, el
 * placeholder desaparece y con el la unica pista de que la busqueda tambien
 * alcanza a la CURP. Es el mismo texto que el del padron, a proposito: es la
 * misma busqueda.
 */
const AYUDA = "Nombre, apellidos o CURP. No distingue acentos.";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "persona", etiqueta: "Persona", ancho: "minmax(0,2fr)" },
  { clave: "curp", etiqueta: "CURP", ancho: "minmax(0,1.2fr)" },
];

const SIN_CURP = "Sin CURP";

type Props = {
  /** `searchParams.q` de `/constancias/emitir`, para que el campo no se vacie. */
  cadena?: string;
  /** Ausente cuando todavia no se busco: es otro vacio, no «sin resultados». */
  resultado?: ResultadoDeBusquedaDeTitulares;
};

const hrefDeEmision = (titular: TitularEncontrado) =>
  `/constancias/emitir?personaId=${titular.id}`;

const curpDe = (titular: TitularEncontrado) =>
  titular.curp ? `CURP ${titular.curp}` : SIN_CURP;

function Curp({ curp }: { curp: string | null }) {
  return curp ? (
    <CeldaDeDato>{curp}</CeldaDeDato>
  ) : (
    <span className="flex min-w-0 items-center">
      <InsigniaDeEstado tono="aviso" etiqueta={SIN_CURP} />
    </span>
  );
}

function FilaDeTitular({ titular }: { titular: TitularEncontrado }) {
  return (
    <FilaDeTabla
      href={hrefDeEmision(titular)}
      etiquetaAccesible={`Emitir la constancia de ${titular.nombreCompleto} · ${curpDe(titular)}`}
    >
      <CeldaPrincipal>{titular.nombreCompleto}</CeldaPrincipal>
      <Curp curp={titular.curp} />
    </FilaDeTabla>
  );
}

/**
 * S4 de `constancias-ux`: buscar a la persona desde la propia pantalla de
 * emision, en vez de un callejon que solo decia «Ir al padron».
 *
 * `<form method="get">` nativo, sin `"use client"` ni Server Action, con el
 * mismo criterio que `BuscadorDePersonas` del padron: la busqueda es una
 * lectura, y una lectura ya tiene URL propia -`?q=...`-, asi que
 * `/constancias/emitir?q=gpe` funciona con JavaScript apagado.
 */
export function BuscadorDeTitular({ cadena, resultado }: Props) {
  const estado = estadoDeLista({
    total: resultado?.titulares.length ?? 0,
    filtro: cadena,
  });

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex max-w-[620px] flex-col gap-1">
        <label htmlFor="q" className={CLASES_DE_ETIQUETA}>
          Buscar persona
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-caliza-apagada"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={cadena}
              aria-describedby="q-ayuda"
              className={`${clasesDeCampo()} pl-9`}
            />
          </div>
          <Boton type="submit">Buscar</Boton>
        </div>
        <p id="q-ayuda" className={CLASES_DE_ETIQUETA}>
          {AYUDA}
        </p>
      </form>

      {estado.clase === "vacio-por-filtro" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial=""
          hrefSinFiltro="/constancias/emitir"
        />
      ) : null}

      {estado.clase === "con-filas" && resultado ? (
        <Tabla etiqueta="Personas encontradas" columnas={COLUMNAS}>
          {resultado.titulares.map((titular) => (
            <FilaDeTitular key={titular.id} titular={titular} />
          ))}
        </Tabla>
      ) : null}

      {resultado?.hayMas ? (
        <p className={CLASES_DE_ETIQUETA}>
          Hay más resultados: escriba más apellidos.
        </p>
      ) : null}
    </div>
  );
}
