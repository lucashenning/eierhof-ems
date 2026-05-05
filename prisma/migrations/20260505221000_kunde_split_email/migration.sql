-- Split Kunde.email into separate addresses for Lieferscheine and Rechnungen.
-- Existing rows: copy old email to both new columns so previously-saved
-- customers keep receiving both document types without re-entry.

ALTER TABLE "Kunde"
  ADD COLUMN "emailLieferscheine" TEXT,
  ADD COLUMN "emailRechnungen"    TEXT;

UPDATE "Kunde"
SET "emailLieferscheine" = "email",
    "emailRechnungen"    = "email"
WHERE "email" IS NOT NULL;

ALTER TABLE "Kunde" DROP COLUMN "email";
