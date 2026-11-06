import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}
export function short(v?: string | null, n = 48) {
  if (!v) return "—";
  return v.length > n ? v.slice(0, n - 1) + "…" : v;
}
