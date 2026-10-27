import { registroDeDomicilios } from "@/modules/territorio";
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
      domicilios: resultado.domicilios.map((domicilio) => ({
        id: domicilio.id,
        calle: domicilio.calle,
        numero: domicilio.numero,
        lugar: domicilio.lugar,
        raiz: domicilio.raiz ?? domicilio.lugar,
        lugarId: domicilio.lugarId,
      })),
      hayMas: resultado.hayMas,
    };
  },
};
