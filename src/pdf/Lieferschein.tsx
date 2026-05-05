import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
} from "@react-pdf/renderer";
import { ean13Bars } from "@/lib/barcode";
import { formatDate } from "@/lib/dates";

type Position = {
  bezeichnung: string;
  ean13: string;
  packungen: number;
  packungsgroesse: number;
  packungenProKiste: number;
};

type Props = {
  nummer: string;
  datum: Date;
  mhd: Date;
  bemerkung: string | null;
  unterschrift: string | null;
  kunde: {
    firmenname: string;
    addressname?: string | null;
    ansprechpartner?: string | null;
    adresse: string;
    plz: string;
    ort: string;
    filialnummer?: string | null;
  };
  positionen: Position[];
  einstellungen: {
    firmenname: string;
    adresse: string;
    plz: string;
    ort: string;
    telefon: string;
  };
  logoBase64: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#222",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 700 },
  logo: { width: 120, height: 120 },
  senderBlock: { fontSize: 9, marginBottom: 16 },
  row: { flexDirection: "row", gap: 16 },
  empfaenger: { flex: 1 },
  datumBox: {
    width: 160,
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    minHeight: 50,
  },
  empLines: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    minHeight: 60,
  },
  freilandLine: { marginTop: 12, marginBottom: 6 },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderBottomWidth: 1,
    borderColor: "#000",
    fontWeight: 700,
  },
  th: {
    padding: 6,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  thLast: { padding: 6 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    minHeight: 32,
    alignItems: "center",
  },
  td: {
    padding: 6,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  tdLast: { padding: 6 },
  colProdukt: { width: "20%" },
  colEan: { width: "30%" },
  colPack: { width: "16.66%", textAlign: "right" },
  colKiste: { width: "16.66%", textAlign: "right" },
  colStueck: { width: "16.66%", textAlign: "right" },
  bemerkung: { marginTop: 16, marginBottom: 16, minHeight: 40 },
  unterschriftLabel: { fontSize: 10, marginTop: 12 },
  unterschriftBox: {
    borderTopWidth: 1,
    borderColor: "#000",
    marginTop: 4,
    paddingTop: 4,
    minHeight: 70,
  },
  signatureImg: { height: 60, width: 200 },
  footer: {
    fontSize: 8,
    color: "#666",
    borderTopWidth: 1,
    borderColor: "#888",
    paddingTop: 4,
    marginTop: 12,
  },
});

function BarcodeSvg({ value }: { value: string }) {
  try {
    const data = ean13Bars(value);
    const widthPt = 90;
    const heightPt = 22;
    const scale = widthPt / data.totalWidth;
    return (
      <Svg width={widthPt} height={heightPt + 8} viewBox={`0 0 ${data.totalWidth} ${heightPt + 8}`}
        preserveAspectRatio="none">
        {data.bars.map((b, i) => (
          <Rect key={i} x={b.x} y={0} width={b.width} height={heightPt} fill="#000" />
        ))}
      </Svg>
    );
  } catch {
    return <Text style={{ fontSize: 8 }}>{value}</Text>;
  }
}

export function LieferscheinDocument(props: Props) {
  const { nummer, datum, mhd, bemerkung, unterschrift, kunde, positionen, einstellungen, logoBase64 } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Lieferschein</Text>
            <Text style={{ fontSize: 9, marginTop: 6 }}>Nr. {nummer}</Text>
          </View>
          <Image src={logoBase64} style={styles.logo} />
        </View>

        <View style={styles.senderBlock}>
          <Text>{einstellungen.firmenname}</Text>
          <Text>{einstellungen.adresse}</Text>
          <Text>{einstellungen.plz} {einstellungen.ort}</Text>
          <Text>Tel. {einstellungen.telefon}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.empfaenger}>
            <Text style={{ fontSize: 9, marginBottom: 4 }}>Empfänger:</Text>
            <View style={styles.empLines}>
              <Text>{kunde.addressname || kunde.firmenname}</Text>
              {kunde.ansprechpartner && <Text>{kunde.ansprechpartner}</Text>}
              <Text>{kunde.adresse}</Text>
              <Text>{kunde.plz} {kunde.ort}</Text>
              {kunde.filialnummer && <Text>Fil. Nr.: {kunde.filialnummer}</Text>}
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, marginBottom: 4 }}>Datum:</Text>
            <View style={styles.datumBox}>
              <Text>{formatDate(datum)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.freilandLine}>
          Freilandeier Güteklasse A, MHD: {formatDate(mhd)}
        </Text>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colProdukt]}>Produkt</Text>
            <Text style={[styles.th, styles.colEan]}>EAN-Code</Text>
            <Text style={[styles.th, styles.colPack]}>Packungen</Text>
            <Text style={[styles.th, styles.colKiste]}>Kisten</Text>
            <Text style={[styles.thLast, styles.colStueck]}>Stück</Text>
          </View>
          {positionen.map((p, idx) => {
            const kisten = Math.ceil(p.packungen / Math.max(1, p.packungenProKiste));
            const stueck = p.packungen * p.packungsgroesse;
            return (
              <View key={idx} style={styles.tr}>
                <Text style={[styles.td, styles.colProdukt]}>{p.bezeichnung}</Text>
                <View style={[styles.td, styles.colEan]}>
                  <BarcodeSvg value={p.ean13} />
                  <Text style={{ fontSize: 7, marginTop: 1 }}>{p.ean13}</Text>
                </View>
                <Text style={[styles.td, styles.colPack]}>{p.packungen}</Text>
                <Text style={[styles.td, styles.colKiste]}>{kisten}</Text>
                <Text style={[styles.tdLast, styles.colStueck]}>{stueck}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.bemerkung}>
          <Text style={{ fontSize: 9 }}>Bemerkung:</Text>
          <Text>{bemerkung ?? ""}</Text>
        </View>

        <Text style={styles.unterschriftLabel}>Unterschrift</Text>
        <View style={styles.unterschriftBox}>
          {unterschrift ? <Image src={unterschrift} style={styles.signatureImg} /> : <Text> </Text>}
        </View>

        <Text style={styles.footer}>
          Die Ware bleibt bis zur vollständigen Bezahlung Eigentum des Lieferanten.
        </Text>
      </Page>
    </Document>
  );
}
