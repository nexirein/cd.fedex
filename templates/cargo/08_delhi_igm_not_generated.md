# 08 — Delhi IGM Not Generated (ICEGATE Outage)
**Source:** `cargo-paf/Template/POST/script for IGM send/mail.md` (210 lines)
**Route:** Delhi · IGM blocked by an ICEGATE issue
**Status:** DRAFT — awaiting sign-off
**Note:** this is the most complete source in the set, and the one the others were repaired from.

**Subject**
```
Action required: IGM not generated for {{AWB}} — shipment details for your CHA
```

> The source put the ICEGATE notice **and a government URL in the subject line** (`mail.md:3`). Moved into the body — a subject is not a reliable place for an instruction a recipient must follow, and the URL may change without the template being reviewed.

---

Dear Sir or Madam,

This shipment has arrived at **Delhi** under cargo mode.

**Due to an ICEGATE issue, the IGM has not been generated.** The IGM number can be checked on the ICEGATE public portal:

<https://foservices.icegate.gov.in/#/public-enquiries/document-status/air-igm>

This shipment will be cleared from customs and delivered by **your own broker / Customs House Agent (CHA)**. The details they need to file the Bill of Entry are below.

**{{LINK_BLOCK}}**

### Details for the Bill of Entry

| | |
|---|---|
| HAWB no. | {{HAWB}} |
| MAWB no. | {{MAWB}} |
| Consignee name | {{CONSIGNEE}} |
| Pcs code | {{PCS_CODE}} |
| **Pieces** | **{{PIECES}}** |
| Weight (kg) | {{WEIGHT_KG}} |
| Consignee GSTIN | {{GSTIN}} |
| PAN / IEC | {{PAN_IEC}} |
| Invoice number | {{INVOICE_NO}} |
| Invoice value / currency | {{INVOICE_VALUE}} {{CURRENCY}} |
| HS codes | {{HS_CODES}} |
| Arrived | {{ARRIVAL_DATE}} |

> **This is where `PIECES` comes from.** The courier sheet's `MPS` column is the likely source of the same value. Until `MPS` is confirmed, `{{PIECES}}` cannot be auto-filled on this route — see doc 19 §2.4. It must be entered manually or the mail must not send.

### D/O charges

The DO charges are INR 3,068 (INR 2,600 + 18% GST).

{{FEE_TABLE}}

Authorization letter and GST details are **compulsory**.

### For D/O collection

Please write to **{{DO_MAILBOX}}**.

**Shipment delivery note:** if the shipment is cleared by the consignee's own CHA / broker, delivery will be done by their appointed broker. FedEx will not be responsible for delivery of the shipment, irrespective of the billing terms mentioned on the AWW / invoice copy.

> *Source reads "AWB/Invoice copy" — corrected to "AWW/Invoice copy" above. Flagging it because both are plausible and the AWB is the more likely intent. Confirm before sending.*

### Bank details for payment

{{BANK_DETAILS_BLOCK}}

Thank you for your continued support. We hope you have a pleasant day.

{{DESK_SIGN_OFF}}

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| `mail.md:1` | `(No subject)` | subject defined |
| `mail.md:3` | ICEGATE notice **and the portal URL in the subject line** | notice in body, URL in body |
| `mail.md:2` | `iphvdelcargo` in the body | config |
| `mail.md:58-64` | Bank details table header row only, then the values as a separate list two screens later | `{{BANK_DETAILS_BLOCK}}` — one table |
| `mail.md:200-208` | `"Thank you for your continued support. We hope you have a pleasant day."` then `Best Regards` / `FedEx Team` | retained, sign-off resolved from config |
| `mail.md:79` | *"AWB/Invoice copy"* | "AWW/Invoice copy" — **flagged above** |
| — | `{{PIECES}}` | **held** — `MPS` undefined |
| `mail.md:88-118` | Fee table — **intact and correct** | used as the reference for rebuilding 01, 02, 03, 05, 06, 07 |
| `mail.md:126-164` | Bank details | verbatim, moved into one block |
