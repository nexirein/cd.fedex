# Clearance Desk — Template Approval Packet

**For:** Division Manager, Clearance
**From:** Clearance Desk build team
**Ask:** Sign off Part A (courier) and Part B (cargo revisions) before Phase 2 build starts

---

## Why this document exists

Two different problems, one page each.

**Courier** has no templates at all. Every courier mail today is typed from scratch, 20–30 a day per agent. We want to ship a standard set — but we are not going to invent customer-facing wording and call it approved. The draft in Part A is **our proposal based on your live cargo mails**, and we need you to correct it.

**Cargo** has ten templates that customers already receive. They work, so we are not rewriting them for the sake of it. But they cannot be loaded as-is: three of them instruct the customer to open a `.tiff` attachment, your own zero-attachment decision (L2) means the link replaces that, and a full read turned up five further defects — including two that change what the customer is billed. All of it is listed in Part B with the before and after, and the revised templates are written out in full in `templates/cargo/`.

Nothing in this packet is live. It is for approval.

---

# PART A — Courier templates (new)

> **⚠️ Read doc 20 before approving this part.** Part A was written before the courier/cargo licence split was established, and it contained an error: it implied the customer's CHA might file the courier Bill of Entry. **They do not.** FedEx holds the courier clearance licence and files via its own Admin team. A third mail shape built on that assumption has been withdrawn. The 11 categories resolve to **2 shapes**, not 3. Doc 20 §2 is authoritative.

## A1. What we found, which is why these are drafts not copies

The courier pull sheet already contains the ask. The `Reason` column has **82 distinct values** across the 11 categories, and each one is a category code plus the specific thing you are waiting on:

| `Master` | Rows | Example `Reason`, verbatim |
|---|---|---|
| RBOE | 143 | `RBOE` · `CI Missing` · `MOC, MOC REQD` |
| CI Missing | 83 | `CI Missing` (the whole cell, no detail) |
| PIMS | 32 | `PIMS, PIMS REQD` · `INVIC;PIMS, CNEE COMPANY NAME REQD ON INV AND PIMS REQD` |
| Invoice Objection | 18 | `INVIC, REQD READABLE INVOICE` · `INVIC, PROPER INVOICE WITH SHIPPER CONSIGNEE DETAILS REQD` |
| Content | 17 | `DESCI, CONTENT NAME REQD ON INVOICE` · `DESCI, LAYER OF PCB CONFIRMATION REQD` |
| Duty | 13 | `ROD, DUTY CNF. RS. 21118.88/- (7.5, 10, 18) HS CODE 84484990` |
| Missing CI | 9 | `INVMS, INVOICE VALUE MISMATCHED PROVIDE CORRECT INVOICE` |
| CBE14 | 6 | `SVB, SVB REQD.` · `DGCA, MOC / DGCA/ DUTY RS. 36181. 15 10 18 HSN 3926` |
| Port Return | 4 | `PFEXP` |
| Value Clarification | 3 | `VALDS, INV VALUE AND CURRENCY CODE CLARIFICATION REQD` |
| MOC | 2 | `MOC, MOC REQD` |
| R&R | 2 | `RETPP, EXPORT DOX REQD` |

**So there are two mail shapes, not eleven.** The skeleton is fixed and shared. The middle — what is being asked for — comes from the row. The Duty category even carries the assessed amount, so the customer sees their own number, not a generic "duty confirmation required".

| Shape | Ask | Categories | Rows |
|---|---|---|---|
| **A** | Supply documents to FedEx | RBOE, CI Missing, PIMS, Invoice Objection, Content, CBE14, Port Return, R&R | 8 · 314 |
| **B** | Confirm a figure | Duty, Value Clarification, MOC | 3 · 18 |

Full templates: `templates/courier/shape_A_send_documents.md` and `shape_B_confirm_figure.md`.

**What we could not source, and are asking you for:** the greeting, the sign-off, and how the link is described to the customer. Courier mail is hand-typed, so there is no historical text to copy. This is the only part of Part A that is genuinely ours.

## A2. The draft — courier boilerplate

> **Subject:** `Clearance update required | AWB {AWB} | {COMPANY} [{case_ref}]`
>
> Dear Sir/Madam,
>
> We are progressing the clearance of your shipment and need one thing from you before we can continue.
>
> | | |
> |---|---|
> | AWB | {AWB} |
> | Company | {COMPANY} |
> | Current issue | {CATEGORY_LABEL} |
>
> **What we need from you**
>
> {THE ASK — cleaned from the Reason column, in plain English}
>
> **Why we need it**
>
> {CATEGORY_RATIONALE — one sentence, per category, see A3}
>
> Please respond by **{DEADLINE}**. After that the shipment is held and additional charges may apply.
>
> **Everything about this shipment is here** — status, what we have, what is still missing, and where to upload:
>
> {LINK}
>
> Nothing needs to be emailed back. If any of the above is already done, or does not apply to you, tell us on this thread and we will close it out.
>
> Thanks & Regards,
>
> {SENDER_NAME} | {DESK}
> FedEx Express | {DESK_CONTACT}
>
> *This mailbox is monitored. Replying keeps this shipment moving.*

## A3. The 11 variants — what fills the blanks

Only the middle two blocks change. Everything else is identical across all 11, which is the point: consistency is the feature.

| `category` | THE ASK (rendered) | WHY WE NEED IT | Items on the link |
|---|---|---|---|
| `rboe` | "We need the Bill of Entry documents for this shipment so the entry can be filed." | The entry has not been filed and duty accrues daily until it is | Commercial Invoice · Packing List · BOE copy |
| `ci_missing` | "We do not have a readable copy of the commercial invoice for this shipment." | Without it we cannot assess duty or file the entry | Commercial Invoice (all pages, legible) |
| `pims` | "We need the import declaration (PIMS) along with the invoice." | The declaration is required before this consignment can be released | PIMS · Commercial Invoice |
| `invoice_objection` | "We need a corrected commercial invoice. {specific defect from the row}" | The invoice on file does not match the manifest, so the entry cannot be filed | Corrected Invoice · Shipper details · Consignee details |
| `content` | "We need a clearer description of the goods. {specific ask from the row}" | Customs will not accept a generic description; it holds the shipment until the item is identifiable | Item description · End use · Technical write-up or catalogue |
| `duty` | "Please confirm the duty of **{AMOUNT}** against HS code **{HS_CODE}**." | Customs has assessed this figure and we need it accepted or queried before release | Duty confirmation · HS code · Declared value |
| `cbe14` | "We need content clarification and {SVB / DGCA} for this shipment." | This category is held pending a specific customs clarification | Content clarification · SVB / DGCA reply · Invoice |
| `port_return` | "We need the export documentation for this shipment." | The consignment is being returned to port and cannot proceed without them | Export documents |
| `value_clarification` | "The invoice value does not match the manifested value. Please confirm the correct value and currency." | A mismatch between declared and manifested value stops the release | Corrected invoice · Value · Currency code |
| `moc` | "We need the MOC (Memorandum of Customs) for this shipment." | It is a mandatory document for this clearance category | MOC |
| `r_and_r` | "We need the export documents for this shipment." | Return-and-re-handle cannot proceed until they are received | Export documents |

> **`ci_missing` and `missing_ci` are one template, not two.** The sheet uses both spellings (83 and 9 rows). They are the same category and get the same mail. This is already locked as C17.

## A4. Six decisions we need signed

| # | Decision | Our recommendation | Why it needs you |
|---|---|---|---|
| **A-1** | Is the greeting `Dear Sir/Madam,` correct for courier? Cargo uses three different ones | **Use `Dear Sir/Madam,`** — matches NFBRK and Kolkata, the two pre-arrival mails | It is customer-facing wording with no courier precedent |
| **A-2** | Sign-off: a **person's name**, or a **desk name**? Cargo does both — `FedEx Trace Team` in one, `Ayush Saklani \| Clearance Administrator, Delhi` in another | **Desk name**, resolved from the case. A named sign-off breaks the moment someone is on leave, and hardcoding a name in a template is how the wrong person gets contacted | Both patterns already exist in your cargo mail, so there is no house rule to follow |
| **A-3** | How is the link described? Proposed: *"Everything about this shipment is here — status, what we have, what is still missing, and where to upload"* | **Approve as written**, or supply the wording your customers are used to | First time a courier customer sees this sentence |
| **A-4** | Deadline wording: *"Please respond by {DEADLINE}. After that the shipment is held and additional charges may apply."* | **Approve**, and confirm the default response window. We propose **48 hours** for courier, because the cargo templates use 3 hours and 16:30 — very different, and courier rows are not as urgent | We have no courier precedent. Guessing this wrong means either panicking customers or losing momentum |
| **A-5** | Should the ask be the **cleaned `Reason` text** (what we propose) or a **fixed sentence per category** (A3) with the row detail appended? | **Cleaned `Reason`**, falling back to the fixed sentence when the row has no detail — 83 of the `ci_missing` rows have no detail at all | Cleaned text reads like a person wrote it, but it inherits the sheet's abbreviations. **We apply a lookup of 82 replacements; approve the list if you want it visible** |
| **A-6** | First sends are held for **agent review**, not auto-sent. Approve this, or instruct otherwise | **Approve the review hold for the first 2 weeks per agent, then auto-send on high-confidence rows** | This is the one control standing between an unapproved template and a customer |

**On A-5, the honest trade-off.** The `Reason` column contains `DESCI, REQD CONTENT CLARIFICATION` and `INVIC, INV NOT OPEN` and `SVB, SVB REQD.` — the same words, typed differently, plus abbreviations. Rendering it raw looks unprofessional. We build a fixed 82-entry substitution list (`DESCI` → nothing, `REQD` → `required`, `REQD.` → `required`, `CNEE` → `consignee`, `INV` → `invoice`, `SVB REQD` → `SVB required`) and hand the remainder to the agent. We would rather you saw that list than discovered the output.

---

# PART B — Cargo template revisions

## B1. Why the existing ten cannot be loaded as-is

There are **ten source files**, not six. The earlier count stopped at the NFBRK and POST folders and missed both FEBRK files and the reminders. All ten are now revised and waiting in `templates/cargo/`.

They are good mails. Six specific things stop them going in unchanged, and most trace to the same decision: **the customer gets a link, not attachments (L2).**

| # | Issue | Where | How many |
|---|---|---|---|
| **1** | **`.tiff` instructions.** Customers are told to open an attached TIFF in Windows Photo Viewer | `NFBRK/nfbrk.md:5` · `POST/cargo arrival notice pre alert/mail.md:15` · `POST/cargo arrival mail template.md:21` | 3 templates |
| **2** | **"Attached / Refer Attachment"** for the authority-letter format and the bank details | `nfbrk.md:20,22` · `pre alert/mail.md:30,32` · `cargo arrival mail template.md:36` | 3 templates, 6 lines |
| **3** | **"As per attached Notification no 34/2021"** — the circular is an attachment today | `nfbrk.md:95` | 1 template |
| **4** | **Personal mailboxes in body text.** NFBRK names **nine individual staff addresses** as the broker escalation path; the Kolkata template names three Jeena staff plus an external address | `nfbrk.md:11` · `cargo arrival mail template.md:107-113` | 2 templates, 12 addresses |
| **5** | **A named person with a direct dial** in the sign-off | `1st mail of same day.../mail.md:84` | 1 template |
| **6** | **Fee tables are structurally destroyed.** The numbers survive but the table does not — they are loose lines with no columns | all 4 fee-bearing templates | 4 templates |
| **7** | **Each FEBRK file names the *other* broker.** See B5-1 | `febrk-Jeena.md:11` · `febrk-sunimpex.md:77` | 2 templates |
| **8** | **Duty advancement fee is calculated on two different bases.** See B5-2 | `febrk-Jeena.md:67` · `febrk-sunimpex.md:67` vs `cargo arrival mail template.md` | 3 templates |
| **9** | **"Service Tax"** — abolished by GST in 2017, while every other line says GST. See B5-3 | `febrk-Jeena.md:62` · `febrk-sunimpex.md:64` | 2 templates |
| **10** | **One template announces a fee table and then omits it entirely.** See B5-4 | `pre alert/mail.md:42-44` | 1 template |
| **11** | **The same sentence twice** in one mail. See B5-5 | `first day reminder mail.md:18,26` | 1 template |

**6 deserves a specific note.** `nfbrk.md:57-87` reads as a list of words and numbers:

```
DELIVERY ORDER        |  Day of arrival
Next day onwards
DO Charges(INR)       2600        2600
ADMIN FEES            0           1000
GST  ( 18% )          468         648
Total                 3068        4248
```

Someone copying this into a template will produce a mail where the customer cannot tell which number is which column — and on a document that says "pay ₹3,068 or pay ₹4,248", that is a payment-ambiguity incident, not a formatting one. **The fee table is rebuilt as a real HTML table rendered from `Fee rule` config**, so the two numbers can never drift apart again.

## B2. The edits, line by line

| Template | Line | Now | Becomes |
|---|---|---|---|
| `nfbrk.md` | 5 | `Please find the attached AWB/ CI in ".tiff" format for filling the documents.(Open with Window Photo Viewer)` | `The AWB and commercial invoice are on your shipment page: {LINK}` |
| `nfbrk.md` | 11 | 9 personal `@fedex.com` addresses listed | `If you need a FedEx-authorised broker, reply to this mail and we will connect you.` Resolved from `cd_agentprofile` at send time |
| `nfbrk.md` | 20, 22 | `(Attached in the format)` · `(Refer Attachment)` | `Both are on your shipment page: {LINK}` |
| `nfbrk.md` | 91 | `**Effective November 22, 2023,` — unclosed bold marker | Close it. As rendered, the marker is literal text in the customer's mail |
| `nfbrk.md` | 95 | `As per attached Notification no 34 / 2021` | `As per Customs Notification 34/2021 dated 29-03-2021` + link to the circular. **See B3 — the citation is still wrong** |
| `cargo arrival mail template.md` | 21 | `PFA the AWB and invoice in .tiff format.` | `The AWB and invoice are on your shipment page: {LINK}` |
| `cargo arrival mail template.md` | 29 | `from 5th of January 5,2026` | `from 5th January 2026` |
| `cargo arrival mail template.md` | 57 | `within 1630 hours of receipt of this mail` | `by 16:30 on receipt of this mail` — and the second deadline, `& till 1430 hrs (on customs Holidays)`, becomes a separate, correct statement |
| `1st mail.../mail.md` | 1 | `to avoid the ₹1180/- admin fee as mentioned in the email below` | Rewritten. The ₹1,180 is the **difference** between ₹3,068 and ₹4,248, not a separate fee, and the ₹4,248 table is what the customer reads |
| `1st mail.../mail.md` | 23–25 | `Effective January 6, 2025, the following DO charge increases will be implemented.` — future tense, and the "increase" is the old figure | Past tense, current figure, effective date stated once |
| `1st mail.../mail.md` | 84 | `Ayush Saklani \| Clearance Administrator, Delhi \| office 18001033339 \| Ext:891008` | Desk-level sign-off, resolved at send time |
| All | sign-off | Three different ones: `FedEx Trace Team`, a named person, and **nothing at all** (`cargo arrival mail template.md:282` ends at `Thanks & Regards,`) | One sign-off, resolved from the case |
| All | greeting | Four variants: `Dear Sir/Madam`, `Dear Sir/Ma'am`, `Dear Customer`, `Dear Sir/ Madam` | One. We propose `Dear Sir/Madam,` |

## B3. Three things we will **not** silently change — they need your decision

| # | Conflict | Detail | Our position |
|---|---|---|---|
| **B-1** | **Wrong customs citation** | The templates say **Notification 34/2021 dated 29-03-2021**. Two different PDFs sit in `Template/NFBRK/`: `Circular-No-08-2021.pdf` and `csnt26-2017.pdf` in `Template/POST/`. One of them is the authority; the mail cites something else | **Do not change until Compliance confirms.** Citing the wrong instrument in a penalty notice to a customer is not our call |
| **B-2** | **Penalty day-count differs by station** | Delhi: ₹5,000/day days 1–3 then ₹10,000/day from day 4. Kolkata: ₹5,000/day **from day 2**, ₹10,000/day **from day 3** | **Delhi wording is locked** (C18) as user-approved. Kolkata needs a separate confirmation, because the source disagrees with Delhi and we cannot tell which is a genuine policy difference or a copy error |
| **B-3** | **Deadline differs by template** | NFBRK: documents within **3 hours**. Kolkata: within **1630 hours** (almost certainly 16:30) plus a second `1430 hrs` customs-holiday deadline | Needs confirmation per station. These are different deadlines with different consequences, and the reminder engine needs one number per gateway |

## B4. Also worth knowing, not blocking

- `MPS` — the courier sheet's only piece-count candidate, values 1–27, `1` on 245 rows — is **undefined**. The arrival notice PDF prints `PIECES` to the customer. Until this is answered we cannot fill that field. **This is the one open item that blocks a build phase.**
- The Kolkata template has two variants (**A.** FedEx CHA clearance / **B.** your nominated CHA) in a single file, and the DO fee table labels its columns `Date of IGM` and `1 day - Till further` where Delhi labels the same table `Day of arrival` and `Next day onwards`. Same numbers, different labels. These become two templates, sharing one fee config.
- Kolkata's DO table shows the same ₹2,600 that Delhi showed **before** the 06-Jan-2025 increase. Whether that increase was ever applied is a live question for Compliance — the customer's amount may be wrong in the current mail.
- The Kolkata template carries a **named staff roster inside the mail body**. Whether the customer should see which individuals are assigned to their file is a question worth answering separately — it is internal information, so it has been removed, but you may want to decide that deliberately.
- The second-day reminder opens by asking the customer to *"file Bill of Entry by your CHA"* and then never mentions the Bill of Entry again — the rest of the mail is only about D/O charges. I have written it as the D/O reminder it evidently is. **If it is also meant to chase a late BOE, tell me** — that changes which facts it must carry.
- `TP hold.md` has **four rows dated `11.07.20226`** and **one row with no arrival date at all** (`533081967883`). A template fix will not stop these recurring while the rows are typed by hand. The gateway team needs to correct them at source.

## B5. Five findings from the full read — the two that matter

These came from reading the remaining five templates end to end. Two of the five are billing-risk and should not wait for sign-off.

### B5-1. ⚠️ Each FEBRK file names the *other* broker — needs confirmation

`febrk-Jeena.md` and `febrk-sunimpex.md` are near-identical copies. Each names the wrong broker:

| File | Says the broker is | Says "cannot be held responsible" |
|---|---|---|
| `febrk-Jeena.md` | **SUNIMPEX** ❌ (line 11) | Jeena & Co. ✅ (line 75) |
| `febrk-sunimpex.md` | SUNIMPEX ✅ (line 13) | **Jeena & Co.** ❌ (line 77) |

This is copy-paste contamination. I corrected each to the right broker. **But I cannot verify from any source that Jeena and Sunimpex are still FedEx's nominated Delhi brokers** — that is a current-state fact with no documentation in the repo. Please confirm.

### B5-2. ⚠️ Duty advancement fee is on two different bases — this changes the bill

| Route | Basis | Source |
|---|---|---|
| Kolkata | 2% of **duty + EDI charges** or INR 800, whichever higher | `cargo arrival mail template.md` |
| Delhi FEBRK | 2% of **invoice** or INR 800, whichever higher | `febrk-Jeena.md:67` · `febrk-sunimpex.md:67` |

2% of *invoice* on a cargo consignment is many multiples of 2% of *duty*. On a single high-value cargo shipment this is a material difference in what the customer is billed. **I have reproduced both verbatim and flagged them in the templates rather than picking one.** One of these is wrong.

### B5-3. "Service Tax" instead of GST

Both FEBRK files say *"Service Tax: As per applicable rates"* (lines 62 / 64). Service tax was subsumed by GST in July 2017; every other charge line in every other template says GST. I changed it to **GST** and flagged it. If a pre-2017 rate is genuinely still being applied somewhere, that is a billing question worth raising on its own.

### B5-4. One template has no fee table at all

`pre alert/mail.md:42-44` announces *"DO Fees"* and *"Admin Fee Charges on late DO collection."* — and then the section simply ends. The numbers are not wrong, they are **absent**, while line 32 separately quotes INR 3,068. Restored from the one intact fee table in the source set.

### B5-5. The same sentence twice

`first day reminder mail.md:18` and `:26` both read *"Please collect the DO by the end of today to avoid the ₹1180/- admin fee."* Nearly verbatim, 8 lines apart. Kept once. I did not keep both and hope nobody notices.

---

## Sign-off

I have read Parts A and B. I approve the courier boilerplate and category asks in Part A as drafted / with the amendments marked below, and the cargo revisions in Part B, except for the items I have marked **held** in B3.

| Item | Decision | Name | Date |
|---|---|---|---|
| A-1 Greeting | | | |
| A-2 Sign-off: person or desk | | | |
| A-3 Link wording | | | |
| A-4 Response window (default 48h) | | | |
| A-5 Cleaned `Reason` text | | | |
| A-6 Agent review before first sends | | | |
| B1–B2 Cargo revisions | | | |
| B3-1 Customs citation · **held** | | | |
| B3-2 Kolkata penalty days · **held** | | | |
| B3-3 Document deadline per station · **held** | | | |
| B5-1 Jeena / Sunimpex still the nominated brokers? | | | |
| B5-2 Duty advancement fee basis · **billing risk** | | | |
| `MPS` meaning · **blocks a phase** | | | |

**Amendments / notes:**

<br><br><br>
