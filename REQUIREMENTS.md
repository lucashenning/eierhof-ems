# Requirements — Eierhof EMS

## The business

**Eierhof Groß Lafferde GbR** sells fresh free-range eggs (Freilandeier Güteklasse A) plus a few liqueurs. Roughly 25 customers — Edeka stores, regional grocers, restaurants, gastro. A driver delivers in a truck several times per week and currently writes paper Lieferscheine. Once a month, the office generates Rechnungen and emails / mails them.

This app digitises that flow. Primary device for the driver is an **iPad in the delivery van** (always online, has SIM); the admin uses a normal laptop / browser.

## Company master data (hardcoded / config)

Used on every printed Lieferschein and Rechnung:

- Name: **Eierhof Groß Lafferde GbR**
- Address: Südstraße 28, 31246 Ilsede
- Tel: 05174/367 · Mobile: 0172/7246676
- Email: info@eierhof-lafferde.de · Lieferschein-Versand: lieferschein@eierhof-lafferde.de
- Tagline: "Frische Eier von Lüddeke´s Hof"
- Steuernr.: 38/231/25208
- Bank: Volksbank BraWo · IBAN DE40 2699 1066 7371 2920 02 · BIC GENODEF1WOB

## Roles

- **Admin** — manages customers, products, prices, users; generates and sends Rechnungen; sees the dashboard and **all** Lieferscheine from every driver. Full access.
- **Fahrer (driver)** — logs in on iPad/phone, creates Lieferscheine on delivery, customer signs on the device. After login lands on a list of **their own** past + today's Lieferscheine with a prominent "Neuer Lieferschein" button. **Sees no prices, no Rechnungen, no Kunden/Produkte/Benutzer/Einstellungen pages, no dashboard.**

## Domain model (German names, English fields)

- **Kunde** (customer): kundennummer, kuerzel (2 letters, used in Rechnungs-Nr.), firmenname, ansprechpartner, adresse, plz, ort, email, telefon, gln, filialnummer, notizen, aktiv. Soft-delete only.
- **Produkt**: bezeichnung (e.g. "Eier Kl. A L br. Freil. (10er)"), ean13, standardpreis (netto), mwstSatz (7 % for eggs, 19 % for liqueurs), einheit ("Packung"), packungsgroesse, packungenProKiste, aktiv.
- **KundeProduktPreis**: per-customer override of standardpreis (sonderpreis netto).
- **Lieferschein**: nummer (auto), kunde, fahrer, datum, mhd (auto = datum + 25 days), status (`Entwurf` / `Unterschrieben` / `Versendet`), unterschrift (base64 PNG data URL), bemerkung, positionen.
- **LieferscheinPosition**: produkt, packungen, **preis** (snapshotted at creation: sonderpreis if defined for this Kunde, else standardpreis). Snapshot is non-negotiable — historical Lieferscheine must show the price at delivery time.

  **Price resolution**: `KundeProduktPreis.sonderpreis ?? Produkt.standardpreis`, snapshotted into `LieferscheinPosition.preis` at creation. Future edits to either source price never affect existing positions.
- **Rechnung**: nummer (auto, format `EG{kuerzel}{lfdNr-6-digit}`, e.g. `EGME102637`), kunde, zeitraumVon, zeitraumBis, status (`Entwurf` / `Freigegeben` / `Versendet`), nettoBetrag, mwstBetrag, bruttoBetrag, **pdfUrl** (set when status → `Freigegeben`, see Use Case 5), references its source Lieferscheine.
- **Einstellungen** (singleton): firm header fields (firmenname, adresse, plz, ort, telefon, email, tagline, steuernr, iban, bic, bankname) + default Bemerkung text. Loaded once at PDF render time.

`onDelete: Restrict` on Lieferschein → Kunde and Lieferschein → Fahrer (use `aktiv` for soft-delete; never hard-delete a Kunde or User with historical Lieferscheine).

## Initial product catalogue (from sample Lieferschein)

`packungsgroesse` = eggs (or units) per Packung. `packungenProKiste` is what the driver uses to compute Kisten on the form.

| Bezeichnung           | EAN-13         | MwSt | packungsgroesse | packungenProKiste |
|-----------------------|----------------|------|-----------------|-------------------|
| Eier 10er L           | 4260694670002  | 7 %  | 10              | 21                |
| Eier 6er L            | 4260694670019  | 7 %  | 6               | 30                |
| Eier 10er M           | 4260694670026  | 7 %  | 10              | 21                |
| Eier 6er M            | 4260694670033  | 7 %  | 6               | 30                |
| Eier 4er XL           | 4260694670057  | 7 %  | 4               | 21                |
| Eier 20er Box         | 4260694670040  | 7 %  | 20              | TBD               |
| Eierlikör 0,7         | 4260694670064  | 19 % | 1               | TBD               |
| Eierlikör 0,35        | 4260694670071  | 19 % | 1               | TBD               |
| Kaffeelikör 0,7       | 4260694670095  | 19 % | 1               | TBD               |
| Kaffeelikör 0,35      | 4260694670088  | 19 % | 1               | TBD               |

Egg `packungenProKiste` values were verified against the 23 sample Rechnungen (every line-item Menge is divisible by these). The TBDs aren't visible in the samples — confirm with Lucas before seeding.

Worked example for the form: `43 × 10er Packungen bei 21 Packs/Kiste = Math.ceil(43/21) = 3 Kisten, 43 × 10 = 430 Eier`.

Standardpreise come from `styles/samples/rechnung.pdf` (10er L = 2,65 €; 6er L = 1,59 €; 10er M = 2,45 €; 6er M = 1,47 €; 4er XL = 1,32 €). Likör prices not visible in samples.

## Seed data

On first `npm run db:seed`:

1. Create one admin user (email + plaintext password from env, see TECH.md).
2. Seed the 10-product catalogue above.
3. **Parse the 23 PDFs in `styles/samples/rechnungen/`** to extract real Kunden (firmenname, adresse, plz/ort, gln, filialnummer where present, kuerzel from the Rechnungs-Nr. prefix) and their **Sonderpreise** per Produkt (Einzelpreise from the line items). This is the ground-truth pricing the farm actually uses.

## Use cases

### 1. Driver creates a Lieferschein on the truck

Single-page form (no wizard), iPad-optimised.

After login the driver lands on `/lieferscheine` showing **their own** Lieferscheine (newest first, today's pinned at top, with status badges). Admin sees the same page but unfiltered (all drivers, all customers, with a Fahrer column). A prominent "Neuer Lieferschein" button on this list opens the form:

1. Picks Kunde from a searchable dropdown (Firmenname / Kundennummer).
2. Datum defaults to today; **MHD auto-fills as Datum + 25 days**, editable.
3. Adds positions: pick Produkt, enter Packungen. Live-shows computed **Kisten = `Math.ceil(packungen / packungenProKiste)`** and **Stück = `packungen × packungsgroesse`** in the row.
4. Optional Bemerkung (default header text "Freilandeier Güteklasse A, MHD: …" lives in the printed PDF, not the input).
5. Customer signs in a `<canvas>` signature pad → status becomes `Unterschrieben`. Once signed, the Lieferschein is **locked**: corrections require a new Lieferschein.
6. Save. PDF generated on the fly and **emailed to `Kunde.email`** from `lieferschein@eierhof-lafferde.de` (status → `Versendet`). If SMTP fails, the Lieferschein is still saved; status stays `Unterschrieben` and admin gets a "send again" button.

Each list row links to a detail page that shows the Lieferschein read-only and offers "PDF anzeigen" / "PDF herunterladen" / "Erneut senden". The form must work one-handed on a phone but is targeted at iPad (≥ 1024×768). Big touch targets, no hover-only interactions.

### 2. Admin manages master data

All data the seed populates is editable in the UI afterwards — nothing is "seed-only".

**Produkte** (`/produkte`): list view with search, plus a row-level edit form. Editable fields:

- Bezeichnung, EAN-13 (validated), Standardpreis (€ netto), MwSt-Satz (7 % / 19 %), Einheit, **packungsgroesse**, **packungenProKiste**, aktiv.
- "Neues Produkt" button for fresh entries.
- Deactivate (`aktiv = false`) instead of deleting; deactivated Produkte hide from the Lieferschein form but stay readable on historical Lieferscheine and Rechnungen.

**Kunden** (`/kunden`): list view with search, plus a detail page per Kunde with two tabs:

- *Stammdaten* — kundennummer, kuerzel, firmenname, ansprechpartner, adresse, plz, ort, email, telefon, gln, filialnummer, notizen, aktiv.
- *Preisliste* — table of all active Produkte showing the Standardpreis and an editable Sonderpreis column. Empty Sonderpreis = use Standardpreis. One save button per Kunde.

**Benutzer** (`/benutzer`, admin only): CRUD for users — name, email, password, role (`ADMIN` / `FAHRER`), aktiv.

**Einstellungen** (`/einstellungen`, admin only): global config that's currently hardcoded but might change over time:

- Firm header block printed on PDFs (firmenname, adresse, telefon, email, steuernr, bank, IBAN, BIC, tagline).
- Default Bemerkung text on the Lieferschein ("Freilandeier Güteklasse A, MHD: …").
- SMTP settings remain in env (`.env` / Vercel) — surfaced read-only here for sanity-check, not editable in the UI.

A single `Einstellungen` row in the DB (singleton) holds the editable values; the seed populates it from REQUIREMENTS.md's "Company master data" block.

### 3. Admin generates monthly Rechnungen

For each active customer:

1. Admin picks a date range (default: previous calendar month).
2. App lists all `Unterschrieben` Lieferscheine for that Kunde in the range, grouped by Lieferdatum.
3. Each position uses its snapshotted `preis` — never the current Standard- or Sonderpreis.
4. Totals computed: per-position Gesamtpreis; summary by Packungsgröße (10er / 6er / 4er counts as in the sample); Netto-Summe; MwSt (7 % and 19 % shown separately if both present); Brutto-Endbetrag.
5. Rechnungsnummer auto-assigned. Status starts `Entwurf`.
6. Admin reviews, marks `Freigegeben` — at this moment the PDF is **rendered once and archived** (see "PDF storage" below). Status `Freigegeben` Rechnungen are immutable.
7. Admin then optionally emails the archived PDF to the Kunde's Email (status → `Versendet`). Also a "download all" / batch-send for end-of-month.

### 4. Admin Dashboard

One landing page for admin, built with shadcn/ui + Recharts:

- Tagesumsatz (today vs. yesterday)
- Monatsübersicht (current month, line chart over days)
- Top-Kunden (by Umsatz in current month)
- Produkt-Statistik (Packungen verkauft, by Produkt, current month)

Read-only; no settings here.

### 5. PDF storage

- **Lieferschein PDFs**: re-rendered on demand from DB data every time someone hits `/pdf/lieferschein/[id]`. The signature is already a base64 PNG on the row; everything else is in the schema. **Not archived** — the email sent to the customer at sign-time is their archive copy.
- **Rechnung PDFs**: rendered **once** at the moment status flips to `Freigegeben`, then archived **immutably**:
  - Production: uploaded to **Vercel Blob**; URL stored in `Rechnung.pdfUrl`.
  - Local dev: written to `./tmp/rechnungen/{nummer}.pdf` (gitignored); `pdfUrl` stores a `file://` URI.
  - Storage backend is auto-selected by presence of `BLOB_READ_WRITE_TOKEN` in env.
  - Once a Rechnung is `Freigegeben`, the PDF bytes are frozen — required by GoBD / §147 AO (8-year retention for invoices). Editing a Rechnung after Freigabe is forbidden by the UI; corrections happen via a Storno/Neuausstellung pair (Phase 2).
- Email attachments for Rechnungen always serve the archived bytes, never re-rendered.

### 5. Both kinds of PDF must match the samples

- **Lieferschein PDF**: same layout as `styles/samples/lieferschein.jpg` — Eierhof header with logo, Empfänger / Datum, "Freilandeier Güteklasse A, MHD: ___", positions table (Produkt | EAN-Code with barcode | Packungen | Kisten | Stück), Bemerkung, Unterschrift, footer "Die Ware bleibt bis zur vollständigen Bezahlung Eigentum des Lieferanten."
- **Rechnung PDF**: same layout as `styles/samples/rechnung.pdf` — header "Frische Eier von Lüddeke´s Hof", company block on the right with logo / address / bank / Steuernr., customer block on the left, "Rechnung Nr." + "Datum" row, positions table grouped by Lieferdatum (Lieferdatum | Menge | Artikel + EAN | Einzelpreis | Gesamtpreis), summary block (Eier 10er Packungen / 6er / 4er / Summe Eier on the left, Summe + MwSt 7 % + Endbetrag on the right).

EAN-13 barcodes must render on the Lieferschein PDF (visual barcodes, not just digits) — see TECH.md for the technique.

## Auth

Email + password. Sessions via signed HTTP-only cookie. Two roles: `ADMIN`, `FAHRER`. Admin creates users.

**Phase 1**: passwords stored in plaintext (`User.password String`). **Phase 2**: switch to `bcryptjs` hashes with a one-shot migration script. (Lucas's call — TECH.md notes the migration plan.)

## Later (deferred, not Phase 1)

- **Admin Dashboard** is in Phase 1 (decided).
- **PWA / Add-to-home-screen** — manifest + icons so iPad can install it standalone. Trivial to add later.
- **ZUGFeRD-konforme E-Rechnungen** (PDF/A-3 + EN-16931 BASIC XML). Mandatory from 01.01.2027 for B2B sellers >800k €/yr. Plan: post-process the existing Rechnungs-PDF.
- **HTTPS subdomain** `app.eierhof-lafferde.de` (CNAME → Vercel) for production.
- **Password hashing** (`bcryptjs`).
- **Security headers** (CSP, HSTS, X-Frame-Options, Referrer-Policy).
- **Backup**: Neon PITR (built-in, 7 days on Launch plan).

## Out of scope (don't build)

- Inventory / hen counts / egg production logging.
- OCR of paper Lieferscheine.
- Customer-facing portal.
- Payments / DATEV export.
- Native mobile apps.
- Multi-tenant / multi-farm.
- Tour planning, push notifications.
- Offline mode (iPads have SIM).

## Open questions for Lucas

- **Customer didn't sign / unattended delivery**: should `Unterschrieben` ever be skippable with a reason note, or is a signature always required? --> For now: REQUIRED. Future: maybe allow skip, we'll get back to this. 
- **Liköre prices** aren't in the sample Rechnungen. Standardpreise to seed --> 14,95 € for 0,7 L and 8,95 € for 0,35 L (both Eier- and Kaffeelikör).
- **`packungenProKiste` for 20er Box and the four Liköre** isn't visible in the samples. Confirm values (or confirm "1" / "no Kiste packaging" if the Liköre ship loose).
