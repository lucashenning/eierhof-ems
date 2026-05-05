# Eierhof EMS — Claude Instructions

You are helping Lucas build **Eierhof EMS**, a small Lieferschein- und Rechnungs-Management-App for the egg farm **Eierhof Groß Lafferde GbR**. The driver issues delivery notes (Lieferscheine) on a tablet, customers sign on the device, and admin generates monthly invoices (Rechnungen) from those Lieferscheine.

## Your job

Build a simple, working app — not an enterprise system. The farm has roughly 25 customers and ~10 products. Keep code minimal, readable, and boring.

## Read these first

1. `REQUIREMENTS.md` — what the app must do (functional)
2. `TECH.md` — the stack, project layout, conventions
3. `styles/` — logo and sample documents (the source of truth for layout):
   - `styles/logo.png` — the Eierhof logo
   - `styles/samples/lieferschein.jpg` — photo of the current paper Lieferschein
   - `styles/samples/rechnung.pdf` — example final invoice PDF
   - `styles/samples/rechnungen/` — 23 real customer invoices (anonymise nothing — these are realistic shapes)

When in doubt about layout, columns, or wording: match the samples.

## Working style

- **German UI, English code.** All user-facing strings are German (Lieferschein, Kunde, Produkt, Rechnung, Fahrer). Code identifiers, comments, and commit messages are English. Domain model names in German (e.g. `Lieferschein`) are fine — just don't mix languages mid-identifier (`createLieferschein` ✅, `erstelleLieferschein` ❌).
- **Server Actions over API routes.** Server Components by default; reach for `"use client"` only when needed (forms, signature pad, table interactions).
- **One file, one concern.** No `services/` / `repositories/` / `domain/` layers. Server actions live next to the route that uses them.
- **shadcn/ui only.** Don't hand-roll buttons, inputs, dialogs.
- **Prisma for all DB access.** No raw SQL unless there's a real reason.
- **Dates in `Europe/Berlin`.** All display dates use `de-DE` formatting (`dd.mm.yyyy`).
- **Money as `Decimal`.** Never `number` for prices, totals, or tax.
- **Role guards first.** Every authenticated server action starts with `requireAdmin()` or `requireUser()`. Fahrer never sees prices, Rechnungen, or the dashboard.
- **Snapshot prices.** When creating a `LieferscheinPosition`, copy the resolved price into `position.preis`. Don't read from `Produkt.standardpreis` later.

## Don't

- Don't add testing frameworks, CI configs, husky, lint-staged, storybook, or monorepo tooling unless asked.
- Don't introduce a state library (no Redux/Zustand/Jotai). React state + server actions is enough.
- Don't add i18n infrastructure — it's a single-language app.
- Don't add analytics, feature flags, or A/B tooling.
- Don't write README walls of text or generate "milestone" / "roadmap" documents. Just ship features one at a time.
- Don't invent business rules. If the samples don't show it and Lucas didn't say it, ask.

## When unsure

Ask Lucas before guessing. The samples in `styles/samples/` show exactly what the printed output should look like — match that.
