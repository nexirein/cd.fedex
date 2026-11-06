# 09 — Delhi Gateway TP-Hold Broadcast
**Source:** `cargo-paf/Template/POST/TP hold.md` (57 lines)
**Audience: INTERNAL.** Cargo operations, not customers. No customer names or addresses appear and none may be added.
**Status:** DRAFT — awaiting sign-off

**Subject**
```
TP hold shipments at DELIP as on {{REPORT_DATE}}
```

---

Hi all,

Please find below the list of shipments held at DELIP for the requirement of **MSDS** and shipments held due to **part arrival**.

| AWB | ORG | DEST | PCS ARRIVED | REASON | STAT | ARRIVAL SOURCE | ARRIVAL DATE |
|---|---|---|---|---|---|---|---|
{{HOLD_ROWS}}

Thanks & Regards,

{{DESK_NAME}}
Clearance Desk — Delhi Gateway

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| `TP hold.md:1` | `TP Hold Shipment Details From Del Gateway DTD 19.07.2026` | `{{REPORT_DATE}}` |
| `:3` | `Hi All` | "Hi all," |
| `:10-12` | Column headers split across lines with embedded `"` and a literal line break inside `"ARRIVAL SOURCE"` | single-line headers |
| `:24`, `:25`, `:26`, `:32` | `11.07.20226` — **four rows** with a malformed year | `11.07.2026` |
| `:32` | `533081967883` — **arrival date missing entirely** | left blank; source has no value. **This row needs the gateway team to confirm the date.** |
| `:55` | `Thanks & Regards...` | `{{DESK_NAME}}` |
| `:57` | `Agraj K Varshney  (he,him,his)\|\|Clearance Broker-Snr \| FedEx Express \| office 011.47700147 \|EICI Building, First Floor, New Courier Terminal Room no 14 IGI Airport New Delhi 110037 INDIA \| www.fedex.com/in` | `{{DESK_NAME}}` + office address from signature config |

### Two notes

1. **The pronouns.** The source sign-off contains `(he,him,his)`. Hard-coded pronouns in a template are wrong twice over: they are not template content, and they are the kind of detail that should live in a person's profile, if anywhere. Removed under **A-2**.

2. **`{{HOLD_ROWS}}` is generated, not hand-typed.** The source is 39 rows pasted by hand into a mail. Every one of those rows can now go stale silently — the source already has four malformed dates from exactly that. In the app this list is a query over held cargo cases, so it is correct by construction.

**The four `20226` rows and the one missing arrival date are data problems in the source, not template problems.** They are listed here so the gateway team can correct them at source. A template fix will not stop them recurring while the rows are typed by hand.
