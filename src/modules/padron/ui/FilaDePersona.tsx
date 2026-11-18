import { MapPin } from "@phosphor-icons/react/ssr";
import {
  CeldaDeDato,
  CeldaPrincipal,
  FilaDeTabla,
  InsigniaDeEstado,
} from "@/shared/ui";
import type { PersonaGuardada } from "../application/puertos";

type Props = {
  persona: PersonaGuardada;
  /** La etiqueta de su domicilio vigente; ausente es «Sin domicilio» (S1). */
  domicilio?: string | undefined;
};

const SIN_CURP = "Sin CURP";
const SIN_DOMICILIO = "Sin domicilio";

const nombreDeLista = (persona: PersonaGuardada): string =>
  `${persona.primerApellido}${
    persona.segundoApellido ? ` ${persona.segundoApellido}` : ""
  }, ${persona.nombres}`;

/**
 * «Calle 20 #42, Colonia Centro, Motul» se lee en dos tonos: la via y el
 * numero en tinta -es lo que distingue dos domicilios de la misma colonia-,
 * y el resto apagado. El corte es la primera coma porque el formato lo fija
 * `etiquetaDeDomicilio` en `territorio/domain`, que siempre empieza por
 * calle y numero.
 */
const separarDomicilio = (domicilio: string): readonly [string, string] => {
  const corte = domicilio.indexOf(",");

  return corte === -1
    ? [domicilio, ""]
    : [domicilio.slice(0, corte), domicilio.slice(corte)];
};

function Domicilio({ domicilio }: { domicilio?: string | undefined }) {
  if (!domicilio) {
    return (
      <span className="text-[15px] text-caliza-apagada">{SIN_DOMICILIO}</span>
    );
  }

  const [via, resto] = separarDomicilio(domicilio);

  return (
    <span className="flex min-w-0 items-start gap-1.5 sm:items-center">
      <MapPin
        size={16}
        aria-hidden="true"
        className="mt-0.5 flex-none text-caliza-apagada sm:hidden"
      />
      <span className="truncate text-[15px] text-caliza-tinta">
        {via}
        <span className="text-caliza-apagada">{resto}</span>
      </span>
    </span>
  );
}

/**
 * En escritorio el encabezado de la columna ya dice «CURP», asi que la
 * celda lleva solo el dato. En el telefono no hay encabezado -la fila se
 * reordena en tres renglones-, y por eso la etiqueta viaja con el valor.
 *
 * «Sin CURP» es una insignia de aviso con icono y palabra (S2): en gris,
 * dentro de una celda de dato, se leia como una CURP que empieza con «Sin».
 */
function CurpDePersona({ curp }: { curp: string | null }) {
  if (!curp) {
    return (
      <span className="flex min-w-0 items-center">
        <InsigniaDeEstado tono="aviso" etiqueta={SIN_CURP} />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="text-[13px] font-medium leading-tight text-caliza-apagada sm:hidden">
        CURP
      </span>
      <CeldaDeDato>{curp}</CeldaDeDato>
    </span>
  );
}

/**
 * Una fila del padron. Es el mismo enlace de `FilaDeTabla` en los dos
 * anchos -de ahi el `aria-label` completo y los 56px minimos de alto-, pero
 * la cuadricula cambia: tres columnas en escritorio y tres renglones en el
 * telefono, con el pin de la direccion donde el encabezado ya no alcanza a
 * decir de que es el texto.
 */
export function FilaDePersona({ persona, domicilio }: Props) {
  const nombre = nombreDeLista(persona);
  const curp = persona.curp ? `CURP ${persona.curp}` : SIN_CURP;

  return (
    <FilaDeTabla
      href={`/padron/${persona.id}`}
      etiquetaAccesible={`Abrir la ficha de ${nombre} · ${curp} · ${
        domicilio ?? SIN_DOMICILIO
      }`}
    >
      <CeldaPrincipal>{nombre}</CeldaPrincipal>
      <CurpDePersona curp={persona.curp} />
      <Domicilio {...(domicilio ? { domicilio } : {})} />
    </FilaDeTabla>
  );
}
