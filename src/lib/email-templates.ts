import fs from "fs/promises";
import path from "path";

const TEMPLATE_DIR = path.join(process.cwd(), "templates", "emails");

const fileCache = new Map<string, string>();

async function loadTemplate(name: string): Promise<string> {
  if (process.env.NODE_ENV === "production" && fileCache.has(name)) {
    return fileCache.get(name)!;
  }
  const raw = await fs.readFile(path.join(TEMPLATE_DIR, `${name}.html`), "utf8");
  fileCache.set(name, raw);
  return raw;
}

/** Tiny {{key}} interpolator — no logic, no escaping by design (templates are
 *  trusted; values may legitimately contain HTML entities). HTML-encode at the
 *  call site if a value comes from untrusted input. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** Plain-text fallback derived from the HTML body — strip tags, collapse spaces. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type EmailFirmContext = {
  firmenname: string;
  tagline: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  bankname: string;
  iban: string;
  bic: string;
  steuernr: string;
};

export async function renderEmail(opts: {
  template: "lieferschein" | "rechnung";
  title: string;
  firm: EmailFirmContext;
  vars: Record<string, string>;
}): Promise<{ html: string; text: string }> {
  const [layout, body] = await Promise.all([
    loadTemplate("_layout"),
    loadTemplate(opts.template),
  ]);

  const merged = { ...opts.firm, ...opts.vars };
  const renderedBody = interpolate(body, merged);
  const html = interpolate(layout, {
    ...merged,
    title: opts.title,
    content: renderedBody,
  });
  return { html, text: htmlToText(renderedBody) };
}
