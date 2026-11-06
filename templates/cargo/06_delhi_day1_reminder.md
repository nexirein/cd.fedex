# 06 — Delhi First-Day Reminder
**Source:** `cargo-paf/Template/POST/1st day reminder mail/first day reminder mail.md ` (106 lines)
**Route:** Delhi · D/O not collected, first reminder
**Status:** DRAFT · rewritten; legal and tariff lines verbatim · awaiting sign-off

**Subject**
```
Reminder: your Delivery Order is still pending | AWB {{AWB}} | {{CONSIGNEE}}
```

---

Dear {{SALUTATION}},

**Your Delivery Order is still waiting to be collected.**

{{LINK_BLOCK}}

## Where your shipment stands

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Arrived at | Delhi, cargo mode |
| Delivery Order | **Pending collection** |
| Days pending | {{DAYS_PENDING}} |

## What this costs if you wait another day

The Delivery Order charge rises if the D/O is not collected on the day of arrival.

**Effective January 6, 2025, the following DO charge increases will be implemented.**

| | Day of arrival | Next day onwards |
|---|---|---|
| D/O charges | INR 2,600 | INR 3,600 |
| Admin fee | 0 | INR 1,000 |
| GST (18%) | 468 | 648 |
| **Total** | **INR 3,068** | **INR 4,248** |

**Collect today and you pay INR 3,068. Tomorrow it is INR 4,248** — a difference of **INR 1,180**.

> The INR 1,180 quoted in the source template is the *difference between the two totals*, not a separate fee. It is computed, never stored.

**The admin fee:** effective **November 22, 2023**, the admin fees applicable on the Delivery Order for inbound shipments changed. If the D/O is not collected on the day of arrival, an additional fee of **INR 1,000 + 18% GST** applies.

**This is a reminder, not a final notice.** The D/O is still available for collection. It only becomes harder once penalties begin to run.

## How to collect it

**1. Write to** {{DO_MAILBOX}} — that is the only address that can process your collection request.

**2. Send the authority letter.** A letter in favour of your broker, from the consignee's official email ID. The format is on your shipment page. **This is compulsory** — without it we cannot release the D/O to anyone but the consignee.

**3. Send the GST details.** Consignee GSTIN. **Also compulsory.**

**4. Send payment proof.** Pay by NEFT using the bank details on your shipment page, then paste the **UTR or IMPS reference** in your mail. A screenshot cannot be matched against our bank statement, and an unmatched payment delays your release.

| | |
|---|---|
| AWB no. | {{AWB}} |
| Consignee GSTIN | {{GSTIN}} |
| UTR no. — NEFT / IMPS | ____________________ |
| Remitter account name | ____________________ |

For freight-related queries, write to {{FREIGHT_MAILBOX}}.

**If you or your CHA collects the D/O from FedEx, you are responsible for the final delivery of the shipment.**

{{DESK_SIGN_OFF}}

---

## Rewrite notes

**Removed a duplicated sentence.** `first day reminder mail.md:18` and `:26` both read *"Please collect the DO by the end of today to avoid the ₹1180/- admin fee."* Nearly verbatim, 8 lines apart. Kept once, in one place, with the figure explained.

**Rewritten** — the reminder now opens with the shipment's actual position rather than *"First Reminder"*; the fee escalation is shown as a before/after comparison with the difference called out, because that is the decision the customer is actually making; collection is broken into four numbered steps each with the reason it is refused if missing.

**Kept verbatim** — the DO tariff effective dates, the admin-fee rule, and both fee columns.

| Source | Change |
|---|---|
| `first day reminder mail.md:1` | `1st Day / SAM DAY  Remibder Mail` — three typos and an unresolved "SAM DAY" → real subject line |
| `:3-9` | Pasted Outlook header, *"Summarize this email"*, a named person in the body | removed |
| `:14` | *"Dear Sir/Mam"* | `{{SALUTATION}}` |
| `:18` **and** `:26` | **Same sentence twice** | kept once, explained |
| `:18`, `:36` | `₹1180/-` and `3068/- INR` in one mail | `INR 1,180` / `INR 3,068` throughout |
| `:38-40` | Fee table split by `-----` dashes, then restated as a sentence | real table |
| `:56-58` | Column header `1 day - Till further` — corrupted | `Day of arrival` / `Next day onwards` per the intact source |
| `:52-89` | Flattened fee table | real table |
| `:34`, `:36`, `:40` | DO tariff dates and amounts | **verbatim** |
| `:102` | `Ayush Saklani \| ... \| Ext:891008` | `{{DESK_SIGN_OFF}}` — A-2 |
| `:104` | Postal address hard-coded | signature config |
