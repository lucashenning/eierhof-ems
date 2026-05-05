import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatDate } from "@/lib/dates";
import { formatNum } from "@/lib/money";
import type { Prisma } from "@prisma/client";

type Position = {
  bezeichnung: string;
  ean13: string;
  packungen: number;
  einzelpreis: Prisma.Decimal;
  gesamtpreis: Prisma.Decimal;
  packungsgroesse: number;
};

type Group = { lieferdatum: Date; positionen: Position[] };

type Props = {
  nummer: string;
  datum: Date;
  kunde: {
    firmenname: string;
    addressname?: string | null;
    ansprechpartner?: string | null;
    adresse: string;
    plz: string;
    ort: string;
    filialnummer?: string | null;
    gln?: string | null;
  };
  groups: Group[];
  zusammenfassung: {
    eier10er: number;
    eier6er: number;
    eier4er: number;
    summeEier: number;
  };
  netto: Prisma.Decimal;
  mwst7: Prisma.Decimal;
  mwst19: Prisma.Decimal;
  brutto: Prisma.Decimal;
  einstellungen: {
    firmenname: string;
    adresse: string;
    plz: string;
    ort: string;
    telefon: string;
    email: string;
    bankname: string;
    iban: string;
    bic: string;
    steuernr: string;
    tagline: string;
  };
  logoBase64: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingHorizontal: 36,
    paddingBottom: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#222",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tagline: { fontSize: 18 },
  logo: { width: 180, height: 180, marginVertical: -8 },
  divider: { borderTopWidth: 1, borderColor: "#000", marginTop: 0, marginBottom: 8 },
  twoCol: { flexDirection: "row", gap: 24, marginBottom: 8 },
  leftCol: { flex: 1 },
  rightCol: { width: 240 },
  micro: { fontSize: 7, color: "#444" },
  microRule: {
    fontSize: 7,
    color: "#444",
    borderBottomStyle: "dotted",
    borderBottomWidth: 1,
    borderColor: "#999",
    paddingBottom: 1,
    marginBottom: 4,
  },
  rechnungZeile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  rechnungLabel: { fontSize: 11 },
  rechnungNr: { fontSize: 13, fontWeight: 700 },
  table: { borderTopStyle: "dotted", borderTopWidth: 1, borderColor: "#000", paddingTop: 4 },
  theadRow: {
    flexDirection: "row",
    fontSize: 9,
    paddingBottom: 4,
    borderBottomStyle: "dotted",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  tr: { flexDirection: "row", paddingVertical: 3, alignItems: "flex-start" },
  colDatum: { width: "16%", fontSize: 10 },
  colMenge: { width: "12%", textAlign: "right", fontSize: 10, paddingRight: 6 },
  colArt: { width: "42%", fontSize: 10 },
  colEinzel: { width: "15%", textAlign: "right", fontSize: 10, paddingRight: 6 },
  colGesamt: { width: "15%", textAlign: "right", fontSize: 10 },
  artHead: { fontSize: 9, color: "#222" },
  artLine: { fontSize: 10 },
  artEan: { fontSize: 9, color: "#444" },
  totalsRow: { flexDirection: "row", marginTop: 16, gap: 24 },
  totalsLeft: { flex: 1, fontSize: 8, color: "#444" },
  totalsRight: { width: 280 },
  totalsLine: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  totalLabel: { fontSize: 11 },
  totalValue: { fontSize: 11, textAlign: "right" },
  bold: { fontWeight: 700 },
});

export function RechnungDocument(props: Props) {
  const { nummer, datum, kunde, groups, zusammenfassung, netto, mwst7, mwst19, brutto, einstellungen, logoBase64 } = props;

  const adressZeile = `${einstellungen.firmenname} * Südstr. 28 * ${einstellungen.plz} ${einstellungen.ort}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRow}>
          <Text style={styles.tagline}>{einstellungen.tagline}</Text>
          <Image src={logoBase64} style={styles.logo} />
        </View>
        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <Text style={styles.microRule}>{adressZeile}</Text>
            <Text style={{ fontSize: 11, marginTop: 4 }}>{kunde.addressname || kunde.firmenname}</Text>
            {kunde.ansprechpartner && <Text>{kunde.ansprechpartner}</Text>}
            <Text>{kunde.adresse}</Text>
            <Text>{kunde.plz} {kunde.ort}</Text>
            {(kunde.filialnummer || kunde.gln) && (
              <Text style={{ marginTop: 2 }}>
                {kunde.filialnummer ? `Fil. Nr.: ${kunde.filialnummer}  ` : ""}
                {kunde.gln ? `GLN: ${kunde.gln}` : ""}
              </Text>
            )}
          </View>
          <View style={styles.rightCol}>
            <Text>{einstellungen.firmenname}</Text>
            <Text>{einstellungen.adresse}</Text>
            <Text>{einstellungen.plz} {einstellungen.ort}</Text>
            <Text>{einstellungen.telefon}</Text>
            <Text style={{ marginTop: 4, color: "#1a73e8" }}>{einstellungen.email}</Text>
            <Text style={{ marginTop: 6 }}>{einstellungen.bankname}</Text>
            <Text>IBAN {einstellungen.iban}</Text>
            <Text>BIC  {einstellungen.bic}</Text>
            <Text style={{ marginTop: 4 }}>Steuernr.: {einstellungen.steuernr}</Text>
          </View>
        </View>

        <View style={styles.rechnungZeile}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Text style={styles.rechnungLabel}>Rechnung Nr.</Text>
            <Text style={styles.rechnungNr}>{nummer}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Text style={styles.rechnungLabel}>Datum</Text>
            <Text style={styles.rechnungLabel}>{formatDate(datum)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.theadRow}>
            <Text style={styles.colDatum}>Lieferdatum</Text>
            <Text style={styles.colMenge}>Menge</Text>
            <Text style={styles.colArt}>Artikel</Text>
            <Text style={styles.colEinzel}>Einzelpreis{"\n"}in €</Text>
            <Text style={styles.colGesamt}>Gesamtpreis{"\n"}in €</Text>
          </View>

          {groups.map((g, gi) => (
            <View key={gi}>
              {g.positionen.map((p, pi) => (
                <View key={pi} style={styles.tr}>
                  <Text style={styles.colDatum}>{pi === 0 ? formatDate(g.lieferdatum) : ""}</Text>
                  <Text style={styles.colMenge}>{p.packungen}</Text>
                  <View style={styles.colArt}>
                    <Text style={styles.artLine}>{p.bezeichnung}</Text>
                    <Text style={styles.artEan}>{p.ean13}</Text>
                  </View>
                  <Text style={styles.colEinzel}>{formatNum(p.einzelpreis)}</Text>
                  <Text style={styles.colGesamt}>{formatNum(p.gesamtpreis)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalsLeft}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Eier 10er Packungen</Text>
              <Text>{zusammenfassung.eier10er}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Eier 6er Packungen</Text>
              <Text>{zusammenfassung.eier6er}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Eier 4er Packungen</Text>
              <Text>{zusammenfassung.eier4er}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Summe Eier</Text>
              <Text>{zusammenfassung.summeEier}</Text>
            </View>
          </View>
          <View style={styles.totalsRight}>
            <View style={styles.totalsLine}>
              <Text style={[styles.totalLabel, styles.bold]}>Summe</Text>
              <Text style={[styles.totalValue, styles.bold]}>{formatNum(netto)}</Text>
            </View>
            {Number(mwst7) !== 0 && (
              <View style={styles.totalsLine}>
                <Text style={styles.totalLabel}>+ Mwst. 7 %</Text>
                <Text style={styles.totalValue}>{formatNum(mwst7)}</Text>
              </View>
            )}
            {Number(mwst19) !== 0 && (
              <View style={styles.totalsLine}>
                <Text style={styles.totalLabel}>+ Mwst. 19 %</Text>
                <Text style={styles.totalValue}>{formatNum(mwst19)}</Text>
              </View>
            )}
            <View style={styles.totalsLine}>
              <Text style={styles.totalLabel}>Endbetrag</Text>
              <Text style={[styles.totalValue, styles.bold]}>{formatNum(brutto)} Euro</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
