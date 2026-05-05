import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

let cached: nodemailer.Transporter | null = null;
let cachedLogo: Buffer | null = null;

function transport() {
  if (cached) return cached;
  const host = process.env.SMTP_HOST || "localhost";
  const port = Number(process.env.SMTP_PORT || 1025);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const auth = user ? { user, pass } : undefined;
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth,
    tls: { rejectUnauthorized: false },
  });
  return cached;
}

async function loadLogo(): Promise<Buffer> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
  return cachedLogo;
}

type Attachment = { filename: string; content: Buffer; contentType?: string };

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
  embedLogo?: boolean;
  from?: string;
}) {
  const from = opts.from || process.env.SMTP_FROM || "Eierhof <lieferschein@eierhof-lafferde.de>";
  const attachments: (Attachment & { cid?: string })[] = [...(opts.attachments ?? [])];
  if (opts.embedLogo !== false) {
    attachments.push({
      filename: "logo.png",
      content: await loadLogo(),
      contentType: "image/png",
      cid: "logo",
    });
  }
  return transport().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments,
  });
}
