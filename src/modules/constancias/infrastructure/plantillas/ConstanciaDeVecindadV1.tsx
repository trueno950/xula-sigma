import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { PropsDePlantilla } from "./tipos";

/**
 * `vecindad-v1`: la unica plantilla de esta fase (`domain/tipoDeDocumento.ts`
 * declara un solo `TipoDeDocumento`). Hoja carta, blanco y negro -design.md
 * de `constancias-oficios`, seccion 6-, pensada para salir de una impresora
 * de oficina compartida, no de una imprenta.
 *
 * **El texto exacto no esta validado con el piloto.** La compuerta de
 * producto de esta fase (`tasks.md`, "Compuerta de producto") es
 * precisamente esa ronda; hasta que cierre, esta redaccion es un borrador
 * funcional, no la version final del documento (design.md seccion 16:
 * "sigue sin muestra el formato del documento").
 */

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
    padding: 56,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  escudo: { width: 56, height: 56 },
  nombreMunicipio: { fontSize: 13, fontWeight: 700 },
  folio: { fontSize: 10, color: "#4a4a4a", marginTop: 2 },
  titulo: {
    fontSize: 15,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 24,
    textTransform: "uppercase",
  },
  parrafo: { lineHeight: 1.6, marginBottom: 14, textAlign: "justify" },
  bloqueFirma: { marginTop: 48, alignItems: "center" },
  lineaDeFirma: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    width: 220,
    marginBottom: 4,
  },
  nombreFirmante: { fontSize: 11, fontWeight: 700 },
  cargoFirmante: { fontSize: 10, color: "#4a4a4a" },
  leyendaDePie: {
    fontSize: 9,
    color: "#6a6a6a",
    marginTop: 24,
    textAlign: "center",
  },
  pieDeValidacion: {
    position: "absolute",
    bottom: 40,
    left: 56,
    right: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qr: { width: 48, height: 48 },
  urlDeValidacion: { fontSize: 8, color: "#4a4a4a" },
  marcaDeAgua: {
    position: "absolute",
    top: "42%",
    left: "18%",
    fontSize: 60,
    color: "#d9d9d9",
    transform: "rotate(-30deg)",
  },
  marcaDeCancelada: {
    position: "absolute",
    top: "40%",
    left: "10%",
    fontFamily: "Helvetica-Bold",
    fontSize: 84,
    color: "#8a8a8a",
    transform: "rotate(-30deg)",
  },
  bandaDeCancelada: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
  },
  textoDeBandaDeCancelada: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#ffffff",
    textAlign: "center",
  },
});

export function ConstanciaDeVecindadV1({
  folio,
  datos,
  municipio,
  qrDataUrl,
  urlDeValidacion,
  reimpresion,
  cancelada,
}: PropsDePlantilla) {
  return (
    <Document>
      <Page size="LETTER" style={estilos.pagina}>
        {cancelada ? (
          <>
            <View style={estilos.bandaDeCancelada}>
              <Text style={estilos.textoDeBandaDeCancelada}>
                CANCELADA - ESTE DOCUMENTO NO TIENE VALIDEZ
              </Text>
            </View>
            <Text style={estilos.marcaDeCancelada}>CANCELADA</Text>
          </>
        ) : reimpresion ? (
          <Text style={estilos.marcaDeAgua}>REIMPRESIÓN</Text>
        ) : null}

        <View style={estilos.encabezado}>
          {municipio.escudo ? (
            <Image
              style={estilos.escudo}
              src={{ data: municipio.escudo, format: "png" }}
            />
          ) : null}
          <View>
            <Text style={estilos.nombreMunicipio}>{municipio.nombre}</Text>
            <Text style={estilos.folio}>{folio}</Text>
          </View>
        </View>

        <Text style={estilos.titulo}>Constancia de vecindad</Text>

        <Text style={estilos.parrafo}>
          Quien suscribe hace constar que {datos.titular.nombreCompleto} es
          vecino(a) de este municipio, con domicilio en {datos.direccion.texto},
          desde el {datos.direccion.desdeEn}.
        </Text>

        <Text style={estilos.parrafo}>
          Se expide la presente constancia a petición de la parte interesada,
          para los fines que a la persona convengan.
        </Text>

        <View style={estilos.bloqueFirma}>
          <View style={estilos.lineaDeFirma} />
          <Text style={estilos.nombreFirmante}>{datos.firmante.nombre}</Text>
          <Text style={estilos.cargoFirmante}>{datos.firmante.cargo}</Text>
        </View>

        {datos.leyendaDePie ? (
          <Text style={estilos.leyendaDePie}>{datos.leyendaDePie}</Text>
        ) : null}

        <View style={estilos.pieDeValidacion}>
          <Image style={estilos.qr} src={qrDataUrl} />
          <Text style={estilos.urlDeValidacion}>
            Verifique este documento en {urlDeValidacion}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
