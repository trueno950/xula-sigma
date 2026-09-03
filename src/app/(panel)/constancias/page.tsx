import { Gear } from "@phosphor-icons/react/ssr";
import { z } from "zod";
import { listarConstancias } from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import { fechaEnMerida } from "@/shared/lib/fecha";
import {
  Aviso,
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  EstadoVacio,
  estadoDeLista,
  FilaDeTabla,
  PaginaDePanel,
  PantallaDeMensaje,
  Tabla,
} from "@/shared/ui";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "emitida", etiqueta: "Emitida", ancho: "minmax(0,1fr)" },
];

/**
 * Ruta fina: resuelve el contexto y lista. Sin `?q=` -`listarConstancias`
 * todavia no tiene busqueda- ni enlace generico "Emitir constancia": por
 * que la emision no vive aca, ver el comentario de cabecera de
 * `constancias/emitir/page.tsx`. Lee `?error=` porque
 * `emitirConstanciaAction` redirige aca con un mensaje redactado cuando el
 * formulario llega invalido -sin este `searchParams`, ese mensaje se perdia
 * en silencio (hallazgo de GGA en la revision de esta rebanada, mismo
 * patron ya usado en `configuracion/page.tsx`).
 *
 * La accion de cabecera es la configuracion del bloque de firma, y es la
 * unica entrada que tiene: `/constancias/configuracion` no estaba enlazada
 * desde ninguna pantalla del panel, asi que el ayuntamiento que no lo tenia
 * configurado no podia configurarlo sin escribir la URL a mano.
 */
export default async function PaginaDeConstancias({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;
  const constancias = await listarConstancias(contexto);
  const estado = estadoDeLista({ total: constancias.length });

  const configuracion = puedeAdministrarDocumentos(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/constancias/configuracion">
      <Gear size={18} aria-hidden="true" />
      Bloque de firma
    </EnlaceDeAccion>
  ) : undefined;

  return (
    <PaginaDePanel titulo="Constancias" accion={configuracion}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {estado.clase !== "con-filas" ? (
        <EstadoVacio
          estado={estado}
          mensajeInicial="Todavia no hay constancias emitidas. Se emiten desde la ficha de la persona, en el padron."
          hrefSinFiltro="/constancias"
          accion={<EnlaceDeAccion href="/padron">Ir al padron</EnlaceDeAccion>}
        />
      ) : (
        <Tabla etiqueta="Constancias emitidas" columnas={COLUMNAS}>
          {constancias.map((constancia) => (
            <FilaDeTabla
              key={constancia.id}
              href={`/constancias/${constancia.id}`}
            >
              <CeldaPrincipal>
                <span className="font-mono">{constancia.folio}</span>
                {constancia.canceladaEn ? (
                  <span className="ml-2 font-sans text-[13px] font-normal text-senial-error">
                    Cancelada
                  </span>
                ) : null}
              </CeldaPrincipal>
              <CeldaDeDato>{fechaEnMerida(constancia.emitidaEn)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      )}
    </PaginaDePanel>
  );
}
