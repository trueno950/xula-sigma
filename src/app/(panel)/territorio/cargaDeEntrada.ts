import { existeCabecera, listarCallesDelMunicipio } from "@/modules/territorio";
import type { LugarConPadre } from "@/modules/territorio/ui/vistaDeDomicilios";
import { zonaDelFormulario } from "@/modules/territorio/ui/zonaDelFormulario";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { ParametrosDeTerritorio } from "./parametros";

type EstadoDeEntrada = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  lugares: readonly LugarConPadre[];
  puedeCrearLugar: boolean;
  conRaiz: boolean;
};

export const cargarEntrada = async ({
  contexto,
  parametros,
  lugares,
  puedeCrearLugar,
  conRaiz,
}: EstadoDeEntrada) => {
  const paneles = conRaiz
    ? { hayCabecera: false }
    : await cargarPanelesDeEntrada(
        contexto,
        parametros.accion,
        puedeCrearLugar,
      );
  const registro = await cargarRegistroDeEntrada(contexto, parametros, {
    puedeCrearLugar,
    conRaiz,
    lugares,
  });

  return {
    domicilioAbierto:
      conRaiz && parametros.accion === "domicilio" && puedeCrearLugar,
    ...paneles,
    ...registro,
  };
};

/**
 * El alta de domicilio servida desde la entrada, cuando la piden sin
 * `?raiz=`: el registro abierto para el rol con permiso, las calles del
 * municipio para el select y su zona.
 */
const cargarRegistroDeEntrada = async (
  contexto: ContextoActual,
  parametros: ParametrosDeTerritorio,
  {
    puedeCrearLugar,
    conRaiz,
    lugares,
  }: {
    puedeCrearLugar: boolean;
    conRaiz: boolean;
    lugares: readonly LugarConPadre[];
  },
) => {
  const registroAbierto =
    !conRaiz && parametros.accion === "domicilio" && puedeCrearLugar;
  const callesDelMunicipio = registroAbierto
    ? await listarCallesDelMunicipio(contexto)
    : [];
  const zonaDeLaEntrada = registroAbierto
    ? zonaDelFormulario(lugares, undefined, undefined)
    : undefined;

  return { registroAbierto, callesDelMunicipio, zonaDeLaEntrada };
};

/**
 * Los paneles de alta de la entrada: hoy solo el asentamiento dispara
 * lectura.
 */
const cargarPanelesDeEntrada = async (
  contexto: ContextoActual,
  accion: ParametrosDeTerritorio["accion"],
  puedeCrearLugar: boolean,
) => {
  return {
    hayCabecera:
      accion === "lugar" && puedeCrearLugar
        ? await existeCabecera(contexto)
        : false,
  };
};
