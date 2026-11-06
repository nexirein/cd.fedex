export type LinkStatus = "NOT_SENT" | "SENT_NOT_OPENED" | "LINK_OPENED_AWAITING_DOCS" | "DOCS_RECEIVED";
export type PreflightResult = "PASS" | "BLOCKED" | "SKIPPED" | "REJECTED";

export const LINK_STATUS_META: Record<LinkStatus, { label: string; badge: string }> = {
  NOT_SENT: { label: "Not Sent", badge: "fx-badge-neutral" },
  SENT_NOT_OPENED: { label: "Sent · Not Opened", badge: "fx-badge-info" },
  LINK_OPENED_AWAITING_DOCS: { label: "Link Opened · Awaiting Docs", badge: "fx-badge-warning" },
  DOCS_RECEIVED: { label: "Docs Received", badge: "fx-badge-success" },
};
export const PREFLIGHT_META: Record<PreflightResult, { label: string; badge: string }> = {
  PASS: { label: "PASS", badge: "fx-badge-success" },
  BLOCKED: { label: "BLOCKED", badge: "fx-badge-danger" },
  SKIPPED: { label: "SKIPPED", badge: "fx-badge-neutral" },
  REJECTED: { label: "REJECTED", badge: "fx-badge-danger" },
};
export const SENDABLE_DEFAULT = ["NFBRK", "FEBRK-JEENA", "FEBRK-SUNIMPEX"];
export function extractEmail(standardRemarks?: string | null) {
  const s = String(standardRemarks || "").trim();
  const m = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : "";
}
export function normalizeAwb(v?: string | null) {
  return String(v || "").replace(/[^0-9]/g, "");
}
export function validAwb(awb: string) {
  return /^\d{11,12}$/.test(awb);
}
