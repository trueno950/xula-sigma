import {
  etiquetaDeDomicilio,
  registroDeDomicilios,
} from "@/modules/territorio";
import type { BuscadorDeDirecciones } from "../application/puertosDeDirecciones";

/** Traduce el contrato de reportes al registro tenant-scoped de Territorio. */
export const buscadorDeDireccionesPorTerritorio: BuscadorDeDirecciones = {
  async buscar(contexto, consulta, limite) {
    const resultado = await registroDeDomicilios(
      { busqueda: consulta },
      contexto,
      limite,
    );

    return {
      domicilios: resultado.domicilios.map((domicilio) => {
        const raiz = domicilio.raiz ?? domicilio.lugar;
        return {
          id: domicilio.id,
          calle: domicilio.calle,
          numero: domicilio.numero,
          lugar: domicilio.lugar,
          raiz,
          lugarId: domicilio.lugarId,
          etiqueta: etiquetaDeDomicilio({ ...domicilio, raiz }),
        };
      }),
      hayMas: resultado.hayMas,
    };
  },
};
