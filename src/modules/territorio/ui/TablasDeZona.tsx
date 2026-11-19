import Link from "next/link";
import type { ColumnaDeTabla } from "@/shared/ui";
import {
  CeldaPrincipal,
  CLASES_DE_ENLACE,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { DomicilioDelRegistro } from "../application/puertosDeDomicilios";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import { etiquetaDeDomicilio } from "../domain";
import { rutaDe } from "./contenido";
import {
  type CalleParaZona,
  FormularioDePertenenciaDeCalle,
  FormularioDeQuitarCalleDeZona,
} from "./FormulariosDeZona";

const COLUMNAS_DE_CALLES: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "quitar", etiqueta: "Acciones" },
];
const SOLO_CALLE = COLUMNAS_DE_CALLES.slice(0, 1);

const COLUMNAS_DE_DOMICILIOS: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "numero", etiqueta: "Número" },
  { clave: "asentamiento", etiqueta: "Asentamiento" },
];

/**
 * Las dos tablas del detalle de una zona. Viven aparte de
 * `DetalleDeZona.tsx` por la metrica de 200 lineas de `AGENTS.md`, y el
 * corte cae por tema: alla la cabecera, las pestanas y el panel; aca lo que
 * cada pestana lista.
 */
const columnasDeCalles = (puedeQuitar: boolean): readonly ColumnaDeTabla[] =>
  puedeQuitar ? COLUMNAS_DE_CALLES : SOLO_CALLE;

/** La calle se lee en su panel de Calles del asentamiento del que cuelga. */
const rutaDeLaCalle = (zona: ZonaGuardada, calle: CalleParaZona): string =>
  `${rutaDe({
    raizId: zona.lugarId,
    nodoId: zona.lugarId,
    vista: "calles",
    calleId: calle.id,
  })}#panel-de-calle`;

/** El domicilio se lee en la ficha de su lugar, que puede ser una colonia. */
const rutaDelDomicilio = (
  zona: ZonaGuardada,
  domicilio: DomicilioDelRegistro,
): string =>
  `${rutaDe({
    raizId: zona.lugarId,
    nodoId: domicilio.lugarId,
    vista: "domicilios",
    domicilioId: domicilio.id,
  })}#panel-de-domicilio`;

export function CallesDeLaZona({
  zona,
  calles,
  callesDelAsentamiento,
  puedeQuitar,
}: {
  zona: ZonaGuardada;
  calles: readonly CalleParaZona[];
  callesDelAsentamiento: readonly CalleParaZona[];
  puedeQuitar: boolean;
}) {
  const zonaId = zona.id;
  const fuera = callesDelAsentamiento.filter(
    (calle) => !calles.some((enZona) => enZona.id === calle.id),
  );

  return (
    <>
      {fuera.length > 0 ? (
        <FormularioDePertenenciaDeCalle zonaId={zonaId} calles={fuera} />
      ) : null}
      {calles.length === 0 ? (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial="La zona no tiene calles todavía. Una zona sin calles no deriva domicilios."
          hrefSinFiltro={`/territorio/zonas?zona=${zonaId}`}
        />
      ) : (
        <Tabla
          etiqueta="Calles de la zona"
          columnas={columnasDeCalles(puedeQuitar)}
        >
          {calles.map((calle) => (
            <FilaDeTabla
              key={calle.id}
              {...(puedeQuitar ? {} : { href: rutaDeLaCalle(zona, calle) })}
              etiquetaAccesible={calle.nombre}
            >
              <CeldaPrincipal>
                {puedeQuitar ? (
                  <Link
                    href={rutaDeLaCalle(zona, calle)}
                    className={CLASES_DE_ENLACE}
                  >
                    {calle.nombre}
                  </Link>
                ) : (
                  calle.nombre
                )}
              </CeldaPrincipal>
              {puedeQuitar ? (
                <FormularioDeQuitarCalleDeZona zonaId={zonaId} calle={calle} />
              ) : null}
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </>
  );
}

export function DomiciliosDeLaZona({
  zona,
  domicilios,
}: {
  zona: ZonaGuardada;
  domicilios: readonly DomicilioDelRegistro[];
}) {
  if (domicilios.length === 0) {
    return (
      <EstadoVacio
        estado={{ clase: "vacio-inicial" }}
        mensajeInicial="La zona todavía no deriva domicilios de sus calles."
        hrefSinFiltro="/territorio/zonas"
      />
    );
  }

  return (
    <Tabla etiqueta="Domicilios derivados" columnas={COLUMNAS_DE_DOMICILIOS}>
      {domicilios.map((domicilio) => (
        <FilaDeTabla
          key={domicilio.id}
          href={rutaDelDomicilio(zona, domicilio)}
          etiquetaAccesible={etiquetaDeDomicilio({
            calle: domicilio.calle,
            numero: domicilio.numero,
            lugar: domicilio.lugar,
            raiz: zona.asentamiento,
          })}
        >
          <CeldaPrincipal>{domicilio.calle}</CeldaPrincipal>
          <CeldaPrincipal>{domicilio.numero}</CeldaPrincipal>
          <CeldaPrincipal>{domicilio.lugar}</CeldaPrincipal>
        </FilaDeTabla>
      ))}
    </Tabla>
  );
}
