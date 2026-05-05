# Tech — Eierhof EMS

## Stack

| Layer            | Choice                                              |
|------------------|-----------------------------------------------------|
| Framework        | Next.js 15 (App Router) on React 19                 |
| Language         | TypeScript (`strict: true`)                         |
| Styling          | Tailwind CSS 4                                      |
| UI components    | shadcn/ui + Radix primitives                        |
| Icons            | lucide-react                                        |
| Tables           | @tanstack/react-table (data tables only)            |
| Charts           | Recharts via shadcn/ui chart components             |
| Forms            | react-hook-form + zod                               |
| DB               | PostgreSQL 16                                       |
| ORM              | Prisma 6+                                           |
| Auth             | Hand-rolled: signed cookie session                  |
| PDF              | @react-pdf/renderer                                 |
| Barcodes (EAN-13)| jsbarcode (data-only mode) → @react-pdf SVG primitives |
| Signature pad    | `<canvas>` + small custom hook                      |
| Email            | nodemailer over SMTP                                |
| Hosting          | Vercel                                              |
| Prod DB          | Neon (Vercel-integrated Postgres)                   |
| Prod file store  | Vercel Blob (Rechnung PDFs only — see "Storage")    |
| Local DB         | Postgres 16 via `docker-compose.yml`                |
| Local SMTP       | Mailpit via `docker-compose.yml` (web UI on :8025)  |
| Local file store | `./tmp/rechnungen/` (gitignored)                    |

No tRPC, no GraphQL, no Apollo, no React Query. Server Actions + Server Components handle data flow.

## Key architecture decisions

- **`onDelete: Restrict`** on `Lieferschein.kunde` and `Lieferschein.fahrer`. Soft-delete via `aktiv` flags. Never destroy historical Lieferscheine.
- **Snapshot prices on `LieferscheinPosition.preis` Decimal** at creation (resolve `KundeProduktPreis.sonderpreis` first, fall back to `Produkt.standardpreis`). Editing a Standardpreis later must NOT rewrite history.
- **EAN-13 in PDFs**: `react-barcode` is incompatible with `@react-pdf` (DOM SVG vs. proprietary SVG). Use `jsbarcode` in data-only mode (pass plain object, not a DOM element) to extract bar widths, then render bars as `@react-pdf` `Svg` + `Rect` primitives. (Alternative fallback: pre-render to PNG.)
- **Signature stored as base64 PNG data URL** in Postgres (`Lieferschein.unterschrift String`). `@react-pdf`'s `<Image src=...>` accepts data URIs directly. Migrate to Vercel Blob only if size becomes a problem.
- **Lieferschein form is a single page**, not a wizard — drivers create dozens per day, navigation friction matters.
- **MHD auto-fills** as `Lieferdatum + 25 days` (editable).
- **Live Kisten/Stück** computed in the form: `Kisten = Math.ceil(packungen / packungenProKiste)`, `Stück = packungen × packungsgroesse`.
- **PDF storage split**: Lieferschein PDFs are re-rendered on demand (no archive); Rechnung PDFs are rendered once at `Freigegeben`, archived immutably to Vercel Blob (prod) or `./tmp/rechnungen/` (dev), and the URL stored on `Rechnung.pdfUrl`. Required by GoBD / §147 AO.
- **Storage backend** chosen at runtime: `BLOB_READ_WRITE_TOKEN` set → Vercel Blob; otherwise local filesystem fallback. Single helper in `lib/storage.ts`.

## Why these choices

- **Neon on Vercel**: zero-config branching, generous free tier, native serverless driver. Prisma's `@prisma/adapter-pg` works on Vercel's Edge / Serverless without Data Proxy.
- **Docker Postgres locally** (Compose): keeps dev identical to prod (Decimal, enums, Postgres-specific indexes). Avoids SQLite drift. One declarative file beats remembering `docker run` flags.
- **Hand-rolled auth**: two roles, ~5 users — NextAuth.js is overkill.
- **@react-pdf/renderer**: real PDF in Node, no headless Chromium on Vercel.

## Project layout

```
eierhof-ems/
├── CLAUDE.md
├── REQUIREMENTS.md
├── TECH.md
├── styles/                       # brand assets + reference samples
│   ├── logo.png
│   └── samples/
│       ├── lieferschein.jpg
│       ├── rechnung.pdf
│       └── rechnungen/           # 23 real example invoices (also seed source)
├── docker-compose.yml            # local Postgres
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # admin user + product catalogue + parsed Kunden
├── public/
│   └── logo.png                  # copy of styles/logo.png
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/                # authenticated routes
│   │   │   ├── dashboard/        # admin landing page
│   │   │   ├── lieferscheine/
│   │   │   ├── rechnungen/
│   │   │   ├── kunden/           # list + detail (Stammdaten + Preisliste tabs)
│   │   │   ├── produkte/         # CRUD incl. packungsgroesse, packungenProKiste
│   │   │   ├── benutzer/         # admin only
│   │   │   ├── einstellungen/    # admin only — firm config singleton
│   │   │   └── layout.tsx        # nav + auth guard + role-based menu
│   │   ├── pdf/
│   │   │   ├── lieferschein/[id]/route.ts
│   │   │   └── rechnung/[id]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx              # role-based redirect
│   ├── components/
│   │   ├── ui/                   # shadcn-generated
│   │   └── signature-pad.tsx
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── session.ts            # cookie session read/write
│   │   ├── auth.ts               # login, requireUser, requireAdmin
│   │   ├── money.ts              # Decimal helpers, format de-DE
│   │   ├── numbering.ts          # Lieferschein- and Rechnungs-Nr.
│   │   ├── barcode.ts            # jsbarcode → @react-pdf Svg helper
│   │   ├── storage.ts            # Vercel Blob | local FS, picks via env
│   │   └── mail.ts               # nodemailer transport
│   └── pdf/
│       ├── Lieferschein.tsx      # @react-pdf/renderer document
│       └── Rechnung.tsx          # both pull firm header from Einstellungen
└── package.json
```

Server Actions live in `actions.ts` next to the route that owns them — e.g. `src/app/(app)/lieferscheine/actions.ts`. No global `actions/` folder.

## Database

### Local

`docker-compose.yml` starts two services:

- **Postgres 16** on `localhost:5432`
- **Mailpit** (fake SMTP + web UI) — SMTP on `localhost:1025`, web inbox on `http://localhost:8025`. All Lieferschein and Rechnung emails captured here during development; nothing leaves the machine.

`.env.local`:

```
DATABASE_URL="postgresql://eierhof:eierhof@localhost:5432/eierhof_ems"
SMTP_HOST="localhost"
SMTP_PORT="1025"
```

Workflow:

```bash
docker compose up -d
npm run db:push       # prisma db push for dev
npm run db:seed       # admin user + product catalogue + parsed customers
npm run dev
```

`docker compose down -v` resets both the DB and the Mailpit inbox.

### Production

Neon, provisioned via Vercel's Postgres integration. Vercel injects `DATABASE_URL` automatically. Migrations on deploy: `prisma migrate deploy` in the `build` script. Phase 2 will switch the user table from plaintext to bcryptjs hashes via a one-shot migration script.

## Env vars

`.env.example` — committed:

```
DATABASE_URL="postgresql://eierhof:eierhof@localhost:5432/eierhof_ems"
SESSION_SECRET="change-me-32-bytes-or-more"
SEED_ADMIN_EMAIL="admin@eierhof-lafferde.de"
SEED_ADMIN_PASSWORD="change-me"

# Local dev: point at Mailpit (no auth). Production: real SMTP credentials.
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Eierhof Groß Lafferde <lieferschein@eierhof-lafferde.de>"

# Vercel Blob token. Leave empty in dev → falls back to ./tmp/rechnungen/.
BLOB_READ_WRITE_TOKEN=""
```

## Conventions

- **`Decimal` for money**, never `number`. Format with `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
- **Dates** stored as `DateTime` UTC; displayed in `Europe/Berlin` via `toLocaleDateString('de-DE')`.
- **Form validation** with zod schemas defined alongside the action.
- **Server actions return `{ ok: true, ... }` or `{ ok: false, error: string }`.** No exceptions thrown across the boundary.
- **No `any`.** Use `unknown` and narrow.
- **File naming**: `kebab-case.ts` for files, `PascalCase` for React components, `camelCase` for everything else.
- **Role guards on every authenticated action**: call `requireAdmin()` or `requireUser()` first; never trust the client.

## Numbering scheme

- **Lieferschein-Nr.**: `LS{YY}{lfdNr 5-digit}`, e.g. `LS2600001`. Counter per year.
- **Rechnungs-Nr.**: `EG{kuerzel 2 letters}{lfdNr 6-digit}`, matching the sample (`EGME102637` = "Edeka Melverode" #102637). Counter is global; `kuerzel` lives on `Kunde`.

## Deployment

Vercel, single environment, auto-deploy from `main`. Preview deploys share the production Neon DB initially (acceptable for this scale; switch to Neon branching later if needed). Custom domain `app.eierhof-lafferde.de` is a Phase 2 step.

## Things explicitly NOT included

- Tests. (Add when something breaks twice.)
- ESLint / Prettier configs beyond Next.js defaults.
- Storybook, husky, lint-staged.
- Internationalisation infrastructure.
- Background jobs / queues.
- Object storage for signatures.
- Password hashing in Phase 1 (Phase 2 adds `bcryptjs`).
- PWA, ZUGFeRD, custom domain, security headers in Phase 1 (see Phase 2 in REQUIREMENTS.md).
- Audit log / soft-delete columns beyond `aktiv`.
