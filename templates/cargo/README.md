# Revised Cargo Templates — 11 files, 10 source templates

**These are the showcase deliverables.** Every one is a real, sendable rewrite.
**Status: DRAFT.** Three items are held for Compliance (B3). Nothing ships until doc 18 is signed.

---

## Source → revision map

| # | File | Source | Route |
|---|---|---|---|
| 01 | `delhi_prealert_nfbrk` | `NFBRK/nfbrk.md` | Delhi, customer-appointed broker |
| 02 | `delhi_prior_intimation` | `POST/cargo arrival notice pre alert/mail.md` | Delhi, prior BOE |
| 03 | `kolkata_charges_A_fedex_cha` | `POST/cargo arrival mail template.md` §A | Kolkata, FedEx CHA |
| 04 | `kolkata_charges_B_nominated_cha` | same file §B | Kolkata, customer CHA |
| 05 | `delhi_same_day_igm` | `POST/1st mail of same day after igm generation/mail.md` | Delhi, DO collection |
| 06 | `delhi_day1_reminder` | `POST/1st day reminder mail/…` | Delhi, first reminder |
| 07 | `delhi_day2_reminder` | `POST/second day/mail.md` | Delhi, second reminder |
| 08 | `delhi_igm_not_generated` | `POST/script for IGM send/mail.md` | Delhi, ICEGATE outage |
| 09 | `delhi_tp_hold_broadcast` | `POST/TP hold.md` | **Internal** gateway broadcast |
| 10 | `febrk_jeena` | `FEBRK/Jeena/febrk-Jeena.md` | Delhi, Jeena nominated |
| 11 | `febrk_sunimpex` | `FEBRK/Sunimpex/febrk-sunimpex.md` | Delhi, Sunimpex nominated |

Source 03 and 04 are one file revised twice — the source contains two distinct mail bodies for the two broker scenarios.

---

## What was fixed, everywhere

| Fix | Detail |
|---|---|
| **Attachments → link** | All 9 `.tiff` / "Attached" / "Refer Attachment" references replaced with `{{SECURE_LINK}}`. Per locked decision L2. |
| **Personal mailboxes → config** | 9 hard-coded `@fedex.com` addresses, 11 `@jeena.co.in`, 6 broker contacts, `Deldo@`, `india@` all moved to config. |
| **Named sign-offs → desk** | `Ayush Saklani \| Ext:891008`, `Agraj K Varshney (he,him,his)`, `FedEx Trace Team` → `{{DESK_NAME}}`. Phones/extensions moved to the signature block config. |
| **Fee tables rebuilt** | Four tables were flattened into loose words and numbers. All rebuilt as real tables from the one intact source. |
| **Currency normalised** | `₹1180/-` and `3068/- INR` mixed in the same mail. Now `INR 1,180` throughout. |
| **Dead text removed** | Pasted Outlook headers, "Summarize this email", `(No subject)`, internal notes, "this are the mails that always in cc". |
| **Typos fixed** | `alwasy`, `Dear Sir/Mam`, `Sunnimpex`, `5th of January 5,2026`, `11.07.20226` ×4, `Willful` → `Willful` context preserved. |

---

## ⚠️ Findings that need a decision, not just a rewrite

These I could not fix by editing. Each is flagged in the file.

### 1. The two FEBRK templates have each other's broker name — `10`, `11`
- `febrk-Jeena.md:11` — *"cleared by FedEx's nominated broker, **SUNIMPEX**"* — in the **Jeena** file.
- `febrk-sunimpex.md:77` — *"FedEx or **Jeena & Co.** cannot be held responsible"* — in the **Sunimpex** file.

I corrected each to the right broker. **Confirm the nominations are still current** — these were the two templates I could least verify.

### 2. Duty Advancement Fee is calculated on two different bases — `03` vs `10`/`11`
- Kolkata (`cargo arrival mail template.md`): 2% of **duty + EDI charges**, or INR 800 — whichever higher.
- Delhi FEBRK (`febrk-Jeena.md:67`, `febrk-sunimpex.md:67`): 2% of **invoice**, or INR 800 — whichever higher.

2% of invoice on a cargo consignment is many times 2% of duty. **I kept both verbatim and flagged them.** One of them is wrong. This changes what customers are billed.

### 3. "Service Tax" — `10`, `11`
`febrk-Jeena.md:62` and `febrk-sunimpex.md:64` both read *"Service Tax: As per applicable rates"*. Service tax was subsumed by GST in 2017. Every other charge line says GST. I changed it to **GST** and flagged it — if any pre-2017 rate is still being applied, that is a billing question, not a typo.

### 4. Four different document deadlines
| Value | Where |
|---|---|
| 3 hours | `nfbrk.md:96`, `pre alert/mail.md:56`, both FEBRK |
| 16:30 | `cargo arrival mail template.md:57` |
| 14:30 hrs | same file, lines 68–70 |
| 18:00 | both FEBRK — *"Office closes at 6:00 pm"* |

I kept each route's own value. **B3-3 holds this.** They cannot all be right, and the difference decides whether a penalty applies.

### 5. One source has no fee table at all — `02`
`cargo arrival notice pre alert/mail.md:42-44` announces *"DO Fees"* and *"Admin Fee Charges on late DO collection."* and then **stops**. The table is gone. I restored it from the intact source.

### 6. Duplicate sentence in the source — `06`
`first day reminder mail.md:18` and `:26` say the same thing twice — *"Please collect the DO by the end of today to avoid the ₹1180/- admin fee."* Kept one. I did not keep both.

---

## Held for Compliance — do not resolve unilaterally

| Tag | Item | Where |
|---|---|---|
| **B3-1** | Customs citation — source says *Notification no 34/2021*, but `Template/NFBRK/` contains `Circular-No-08-2021.pdf` | 01, 02, 03, 04, 10, 11 |
| **B3-2** | Penalty day-count — Delhi ₹5,000 from day 1; Kolkata ₹5,000 from day 2 | 03, 04 |
| **B3-3** | Document deadline — 3 h vs 16:30 vs 14:30 vs 18:00 | all |

B3-1 wording is left **verbatim** in every file, marked with an HTML comment that will not render in the mail. B3-2 and B3-3 are likewise preserved as-found. I have not quietly standardised them, because a penalty notice citing the wrong instrument is a compliance decision.

---

## Placeholder convention

`{{AWB}}` `{{CONSIGNEE}}` `{{ARRIVAL_DATE}}` `{{DESK_NAME}}` `{{SECURE_LINK}}` …
Double braces, uppercase. Every one resolves from a Dataverse column — see doc 13.

`{{FEE_TABLE}}` is rendered from `Fee rule` (doc 13) so the two totals can never drift apart again. That was the root cause of the flattened tables.
