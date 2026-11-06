import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transport: Transporter | null = null;
function getTransport() {
  if (transport) return transport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  transport = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  return transport;
}

export async function sendMail(input: { to: string; subject: string; html: string }) {
  const t = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await t.sendMail({ from, to: input.to, subject: input.subject, html: input.html });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
