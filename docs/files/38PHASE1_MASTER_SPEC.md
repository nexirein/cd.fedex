# 38 — PHASE 1 MASTER SPEC (Build Reference)
### Cargo Clearance Desk · canonical build document for Canvas Authoring MCP

**Status:** supersedes doc 37 for data model, screens, flows and configuration.
Doc 37 survives only for its narrative and non-negotiables sections.

**Read before writing any YAML.** Every list, column, type, screen and flow below is
decided. Do not invent alternatives. If something here is wrong, change it here first.

---

## 0. How to use this document with MCP

| Step | Tool |
|---|---|
| 1. Provision the SharePoint data layer | `provision-sharepoint.ps1` (see §5) |
| 2. Pull current app state | `canvas-authoring_sync_canvas` — **into a clean YAML-only directory, once** |
| 3. Build screens in §8 order | write `.pa.yaml` files |
| 4. Validate + push | `canvas-authoring_compile_canvas` |
| 5. Verify server state | `canvas-authoring_sync_canvas` into a **different** clean directory, diff |

**Hard rule:** `sync_canvas` is a *pull*. Calling it on your working directory after
editing overwrites your work. Use a second throwaway directory to read back.

**Naming rules so the Dataverse repoint stays cheap:**
- Every list/table → `CD_` prefix
- Every screen → `Scr` prefix
- Every flow → `CD_F##_` prefix
- No business logic in screen formulas. Screens render; flows decide.

---

## 1. THE DAY — real volume, not a toy

From `cargo-paf/docs/cargo-pre-alert-operations-model.md:40-42,175-190`:

| Fact | Value |
|---|---|
| Batch size | ~150 rows |
| Batches per day | 2–3 |
| Sender | **one shared mailbox ID**, sends to all customers |
| Source | IGM Console → Excel export |
| Manual time today | **1.5 hours for 150 emails** (Excel + VBA + Outlook, per teammate) |
| Target | 3–5 minutes, one operator |
| Sub-batch chunk size | 25 or 50 (`sub-batch.ts`) |

**Consequence:** nothing in this design may assume a small batch. 150 rows × 3
batches = 450 cases/day. Pacing, throttling and partial-failure handling are
first-class, not polish.

### 1.1 The scope boundary — where our work starts

This is the most important thing in the document, and it was got wrong twice.

```
  UPSTREAM — NOT OURS                          │  OURS — PHASE 1
  ─────────────────────────────                │  ─────────────────────────────
  One person:                                 │
    • VLOOKUP on the 40,000-row master         │
    • formats the final Excel                  │
    • calls new customers re: CHA preference   │
        │                                     │
        ▼                                     │
  ┌────────────────────────────┐               │
  │  READY EXCEL ARRIVES       │──────────────▶│ validate → enrich → send
  │  (type resolved, emails    │               │ link · auto-fetch invoice
  │   present, nothing missing)│               │ collect → payment → DO
  └────────────────────────────┘               │ BOE/CHA → close → report
                                               │
                                               ▼
                                        one pre-alert, per event,
                                        zero attachments, always current
```

**The 1.5 hours contains none of the left column.** `[verified]`
`cargo-paf-operations-model.md:32-37` — the VBA script *reads each row of the
finished Excel* and generates the mail. The VLOOKUP is a **different person, on a
different task, and is not inside the measured window.**

So the baseline we eliminate is clean and entirely in scope:

> **150 emails, generated and sent one-by-one through Outlook = 1.5 hours.**
> Roughly one email a minute. That is the number we are replacing.

**Three things we are explicitly NOT building**, because they are upstream and
replacing them adds no value here:

| Not building | Why |
|---|---|
| The 40k/36k master VLOOKUP | A person already does it, reliably, and hands us the answer. Our input arrives resolved. |
| The Excel formatting | Same — our input is already formatted. |
| The new-customer CHA-preference call | Upstream. We only *detect* that it hasn't happened yet and route a call task (§4.14). |

> **Earlier drafts of this spec built a 36,000-row `CD_CompanyClearance` list, a
> three-tier fuzzy matcher, and a `CD_F22_ResolveClearance` flow to replace the
> VLOOKUP. All of that was removed.** It was solving a problem we do not have, in a
> place where the answer already exists. The VLOOKUP is not a value-add opportunity;
> it is a prerequisite somebody else already satisfies. See §4.14 for what replaced it.

### 1.2 What the value-add actually is

Eight things, and only these eight. Ranked by hours saved:

| # | Value-add | What it replaces |
|---|---|---|
| 1 | **Batch send engine** — paced, sub-batched, template-filled, no per-row Outlook | **the 1.5 hours** |
| 2 | **One always-current link** — zero attachments, any device | forwarded doc chains, per-event mails |
| 3 | **Auto-fetch the invoice** from ACCS → PDF → shown on the link | manual TIFF hunting, per AWB |
| 4 | **Structured document collection** — checklist per AWB, not a mail thread | chasing replies by hand |
| 5 | **Reply ingestion + classification** | reading Outlook to work out who replied |
| 6 | **Payment → UTR → DO tracking** | hand-edited fee tables, hunting for UTR |
| 7 | **BOE / CHA confirmation loop** | *"status is found by asking another team"* |
| 8 | **Batch metrics, UBOND and CONSOL separately** | no idea what actually got sent |

**Every number in this spec that came from source is marked `[verified]`. Everything
else is a design decision I'm making now and you can override.**

---

## 2. NON-NEGOTIABLES

Violating these makes the demo fail, not merely look weak.

1. **Never guess.** Unresolved clearance type → Needs Attention with the reason. Never fall back to a wrong template.
2. **Never silently drop a row.** Every rejected row carries a reason and a fix. Rejection is a *visible state*, not an absence.
3. **Fail closed on send.** Pre-flight scans every placeholder. Any unfilled placeholder blocks the send for that row only — never the whole batch.
4. **Zero attachments to customers.** Documents live behind the link. The mail carries the link only.
5. **Max 3 reminders,** then escalate. Clock stops the instant the customer replies.
6. **Confidence gates are the real ones:** draft floor `0.7`, routine auto-send `0.7`, strict auto-send `0.97`, plus hard exclusions (high/critical urgency, VIP, legal keywords). See §10.4.
7. **Test mode on by default.** Four kill switches + `CD_TestMode`.
8. **Synthetic data only.** No real AWBs, customer names, or bank references in the demo.
9. **Append-only event log.** Event rows are never edited or deleted. No exceptions.

---

## 3. THE THREE PIPELINES

This is the correction to doc 37, which modelled one pipeline. There are three,
with different triggers, different columns and different success measures.

### 3.1 Pipeline A — UBOND batch (pre-arrival)

```
[Shared mailbox receives UBOND Excel]
   → validate headers + rows
   → normalise defects (§6)
   → dedupe against existing open cases
   → [STUB] enrich from ACCS
   → resolve clearance type → template
   → compute fee
   → build per-customer document pack + link
   → pre-flight scan
   → operator reviews → SEND (paced, sub-batches of 25)
   → open cases, reminder clock starts
```

**Measures:** rows in → accepted / rejected → pre-alerts sent → documents received → closed.

### 3.2 Pipeline B — CONSOL batch (post-arrival)

**Different flow, different trigger, different measures.** CONSOL arrives *after*
the pre-alert, from IGM, carrying the MAWB-level data.

```
[Shared mailbox receives CONSOL Excel  (Data Type = CONSOL-01)]
   → match each row to an EXISTING open case by AWB
       exact  → attach, continue
       fuzzy  → "Unsure" queue, operator confirms      (never auto-merge)
       no hit → create as a post-arrival orphan, flag it (never a duplicate)
   → write back MAWB, IGM number, flight, origin, destination, arrival date
   → recompute fee tier  (arrival-day vs next-day can flip here)
   → generate arrival notice
   → operator reviews → SEND
   → DO pending
```

**Critical:** CONSOL re-prices the case. A case created under Pipeline A at ₹3,068
can move to ₹4,248 at CONSOL time. The system must restate the number and the reason,
not silently overwrite it.

**Measures:** rows in → matched / unsure / orphan → notices sent → DO issued.

### 3.3 Pipeline C — TP Hold (Phase 2, schema reserved)

Hold sheet columns: reason, status code, arrival source, arrival date, origin,
destination, pieces. Reserved in the schema so the repoint doesn't need a migration.
**Not built in Phase 1.**

### 3.4 The third party — the CHA, and why FEBRK is not NFBRK

Doc 37 treated the broker as a name on a row. It is not. For cargo there are
**three external parties and the licence split decides who does what.** `[C4]`
`doc 20 §2`, `[verified]`

| | **Courier** | **Cargo — our scope** |
|---|---|---|
| Who files the BOE | **FedEx Admin team** | **The CHA** |
| Where | FedEx's own process | ICEGATE, by a licensed CHA |
| Customer's customs relationship | None | Own broker, or FedEx-nominated (Jeena / Sunimpex) |
| Customer is asked to | Supply documents | Supply documents **and arrange filing** |
| Ends when | BOE filed by Admin | CHA confirms *"BOE filed"* |
| Mail shapes | 2 (A, B) | broker-specific |

> FedEx holds a **courier** clearance licence. It does not hold a **cargo** clearance
> licence. This is the single most important line in this document. Any screen, mail
> or flow that implies FedEx files a cargo BOE is wrong, and the difference is a
> licence, not a wording preference.

**We never touch ICEGATE.** The system records *"BOE filed"* when the CHA confirms.
That confirmation is a data point we capture, not an action we perform. PRD §1,
*"we are not replacing ACCS, ICEGATE or the CHA's work."*

#### 3.4.1 The real difference between NFBRK and FEBRK

The two are not two fee tiers. They are **two different sets of responsible parties.**

```
NFBRK  ── No FedEx broker.  The customer appoints their own CHA.
          FedEx's job: collect documents.  Then stop.
          The CHA files the BOE, releases, and is responsible for
          final delivery to the consignee.
          ▸ Febrk-Jeena / Sunimpex are OFFERED, not appointed.

FEBRK  ── FedEx broker appointed.  FedEx has nominated a CHA.
          FedEx's job: collect documents AND notify the named CHA
          with a link to them.
          The named CHA files the BOE and does the clearance.
          ▸ {BROKER_NAME} is MANDATORY here, not optional.  [C11]
```

**The consequence that bites:** for FEBRK, *the broker **is** the CHA*. `End Result =
FEBRK` + `FedEx Broker = Jeena` resolves to a CHA-facing notification. For NFBRK there
is **no CHA name anywhere on the row** — the customer brings their own, and we never
learn it unless they tell us.

That is why a bare `FEBRK` is a hard block (§5.3) and a bare `FEBRK` in the *broker*
column is a different, equally fatal defect: it means nobody is appointed to file.

#### 3.4.2 NFBRK has a sub-split, and the Kolkata template proves it

`doc 18` §— *"the Kolkata template has two variants (**A.** FedEx CHA clearance /
**B.** your nominated CHA) in a single file."* So NFBRK is not one path:

```
NFBRK / Delhi
  └─ customer brings own CHA  (default — the NFBRK mail opens with
     "We respect your decision to appoint your own broker")

NFBRK / Kolkata  (JFS Freight)
  ├─ A. FedEx CHA clearance      ── ₹3,000 + GST  (template 3 only)
  └─ B. your nominated CHA       ── standard DO fee table
```

`NFBRK` alone is therefore **not** a template key. It is a *question*. The system must
ask it, and record the answer, before it can pick a document pack. The historical
answer to that question was a phone call to a new customer — one of the pains this
app exists to remove (PRD §1, *"new customers are called individually"*).

#### 3.4.3 KYC is a gate, not a checkbox

`doc 17 §1.6` `[verified]`, verbatim from the Kolkata mandatory list:

> *"KYC Form + supporting docs, self-attested — complete, signed, stamped,
> **photograph mandatory**. One-time. **Without KYC the CHA cannot complete
> clearance.**"*

So KYC is **one-time per customer, and it blocks the CHA.** A CHA notified about an
AWB whose consignee has no KYC on file will simply decline it. KYC therefore sits
**upstream of the CHA notification** (§3.4.5), and it is a case type of its own.

#### 3.4.4 Location changes everything, and nothing in the source says so

Delhi and Kolkata are not two locales on one template. `[verified]`

| | **Delhi / IGI** | **Kolkata / JFS Freight** |
|---|---|---|
| BOE penalty | ₹5,000/day **days 1–3**, then ₹10,000/day from day 4 `[C18]` | ₹5,000/day **from day 2**, then ₹10,000/day from day 3 |
| Document deadline in the mail | **3 hours** from receipt | *"1630 hours"* — almost certainly **16:30** `[C7]` |
| FedEx CHA clearance fee | not offered | **₹3,000 + GST**, *"from 5th of January 5, 2026"* — **typo in source** |
| Mandatory doc list | short (invoice + formats) | the **7-item** list, incl. KYC, IEC, GST, e-way bill, bank AD code |
| Fee table column labels | `Day of arrival` / `Next day onwards` | `Date of IGM` / `1 day - Till further` |

> **Delhi wording is locked** `[D6]`. The penalty numbers are **not** locked in the
> opposite direction — Kolkata's later start is a real difference in the source, and
> seeding Delhi's numbers for Kolkata would be a fabricated fact. `Location` becomes a
> required key on every fee rule and document pack.

#### 3.4.5 The cargo chain, with every party

```
UBOND 06:00 ─┐
CONSOL 08:00 ─┼─→ Trace Cargo ─→ PRE-ALERT ─→ CUSTOMER ─┐
MAWB/IGM 10:00┘   (collect docs)                          │
                                                         ▼
                              ┌──────── KYC on file? ─────┴─ NO → KYC case, blocked
                              │  YES
                              ▼
                     ┌──────────┴───────────┐
              FEBRK                      NFBRK
        (broker = CHA)          (customer's own, or FedEx-nominated)
              │                        │
              ▼                        ▼
      F23: CHA assignment        (nothing to notify —
       one link, no attachment)   the customer owns the filing)
              │                        │
              ▼                        ▼
        CHA files BOE on ICEGATE ── not our system
              │
              ▼
      CHA confirms "BOE filed" ──→ F24 records it, closes the loop
              │
              ▼
      IGM verifies payment, issues DO
```

**A CHA notification is a second external mail, to a second external party, with a
link and zero attachments** — same discipline as the customer mail (§8.2). It carries
the AWB, the flight particulars (`doc 17 §1.8`, *"correspondence must cite AWB number
and flight particulars"*) and the case reference. It goes out **only when the
checklist is complete**, because a CHA who opens the link to find three missing
documents will send it straight back.

**Out of scope, permanently:** filing the BOE, tracking it on ICEGATE, and any
integration with the CHA's own systems. `[C4]`

---

## 4. DATA MODEL — every list, every column

Types are SharePoint column types with the Dataverse target in brackets.
`req` = required. `calc` = computed by flow, never by user.

### 4.1 `CD_Batch` — one row per uploaded Excel file

| Column | Type | req | Notes |
|---|---|---|---|
| `Title` | Text | ✓ | `BATCH-{yyyyMMdd-HHmmss}-{pipeline}` |
| `Pipeline` | Choice `UBOND`/`CONSOL`/`TPHOLD` | ✓ | drives the whole downstream flow |
| `SourceFile` | Text | ✓ | original filename |
| `SourceMailId` | Text | | message id of the mail carrying the file |
| `UploadedBy` | Text | ✓ | agent email |
| `UploadedAt` | DateTime | ✓ | |
| `RowCountIn` | Number | ✓ | raw rows in the sheet |
| `AcceptedCount` | Number | calc | |
| `RejectedCount` | Number | calc | |
| `SentCount` | Number | calc | |
| `DocsReceivedCount` | Number | calc | **the headline funnel metric** |
| `ClosedCount` | Number | calc | |
| `Status` | Choice | ✓ | `UPLOADED`→`VALIDATING`→`READY`→`SENDING`→`SENT`→`CLOSING`→`CLOSED` / `PARTIAL` / `FAILED` |
| `SubBatchSize` | Number | | 25 or 50, default 25 |
| `SendStartedAt` | DateTime | calc | |
| `SendFinishedAt` | DateTime | calc | |
| `Notes` | Text | | |

### 4.2 `CD_Shipment` — one row per AWB. The spine.

| Column | Type | req | Notes |
|---|---|---|---|
| `Title` | Text | ✓ | **the AWB**. 11 or 12 digits `[verified: C19]` |
| `Batch` | Text | ✓ | → `CD_Batch.Title` |
| `Pipeline` | Choice | ✓ | `UBOND` / `CONSOL` |
| `Company` | Text | ✓ | consignee name |
| `ContactEmail` | Text | ✓ | primary recipient |
| `CCEmails` | Text | | semicolon-separated, from `Standard Remarks` |
| `ConsigneeName` | Text | ✓ | |
| `Broker` | Choice | | `JEENA` / `SUNIMPEX` / `OWN` / blank |
| `ClearanceType` | Choice | ✓ | `NFBRK` / `FEBRK-JEENA` / `FEBRK-SUNIMPEX` / `CALLING` / `HOLD` / `UNRESOLVED` |
| `TemplateName` | Text | calc | resolved template |
| `MAWB` | Text | | CONSOL writes it |
| `IGMNumber` | Text | | CONSOL writes it |
| `Flight` | Text | | |
| `Origin` | Text | | |
| `Destination` | Text | | |
| `ArrivalDate` | Date | | drives the fee tier |
| `HSN` | Text | | |
| `InvoiceValue` | Currency | | |
| `Pieces` | Number | | see §6 defect D-5 |
| `Weight` | Number | | kg |
| `Freight` | Currency | | in the subject line |
| `Currency` | Text | | `INR` |
| `FeeINR` | Currency | calc | 3068 or 4248 |
| `FeeTier` | Choice | calc | `ARRIVAL_DAY` / `NEXT_DAY_ONWARD` |
| `FeeBasis` | Text | calc | human-readable arithmetic |
| `Status` | Choice | ✓ | §5 state machine |
| `SendState` | Choice | ✓ | `NOT_SENT`/`PREFLIGHT_PASS`/`PREFLIGHT_BLOCK`/`SENT`/`FAILED` |
| `ReminderCount` | Number | calc | 0–3 |
| `LastReminderAt` | DateTime | calc | |
| `CustomerResponded` | Yes/No | calc | **stops the reminder clock** |
| `LinkToken` | Text | calc | per-shipment, unique |
| `LinkExpiry` | DateTime | calc | |
| `ClaimedBy` | Text | | agent email who claimed the case |
| `ClaimedAt` | DateTime | | |
| `TestMode` | Yes/No | ✓ | |
| `RejectReason` | Text | | why this row was rejected |
| `CreatedAt` | DateTime | ✓ | |
| `UpdatedAt` | DateTime | ✓ | |
| `Summary` | Text | calc | AI-generated plain-English case summary, §9.6 |

**Index on `Title` (AWB).** Two rows per AWB is legal: one UBOND, one CONSOL, linked
by AWB. Prefer merging into one row (Pipeline field records the latest stage).

### 4.3 `CD_ShipmentEvent` — append-only audit

| Column | Type | Notes |
|---|---|---|
| `Title` | Text | `{AWB} · {ISO timestamp}` |
| `AWB` | Text ✓ | |
| `EventType` | Choice ✓ | see §4.4 event catalogue |
| `Detail` | Text ✓ | plain English, never a code |
| `Actor` | Text ✓ | agent email, or `SYSTEM`, or `CUSTOMER` |
| `Timestamp` | DateTime ✓ | |
| `Batch` | Text | |
| `FromStatus` | Text | |
| `ToStatus` | Text | |

**Never edited. Never deleted.** This is the audit trail and on SharePoint it is
the *only* audit trail — there is no field history.

### 4.4 Event catalogue — use these exact values

`BATCH_CREATED` · `ROW_ACCEPTED` · `ROW_REJECTED` · `ENRICHED` · `ENRICH_FAILED` ·
`TYPE_RESOLVED` · `TYPE_UNRESOLVED` · `TEMPLATE_ASSIGNED` · `FEE_COMPUTED` ·
`FEE_RECOMPUTED` · `CHECKLIST_BUILT` · `LINK_GENERATED` · `PREFLIGHT_PASS` ·
`PREFLIGHT_BLOCK` · `SEND_STARTED` · `SENT` · `SEND_FAILED` · `REPLY_RECEIVED` ·
`REPLY_CLASSIFIED` · `REPLY_AUTO_HANDLED` · `REPLY_DRAFTED` · `REPLY_ESCALATED` ·
`DOC_RECEIVED` · `CHECKLIST_COMPLETE` · `REMINDER_SENT` · `REMINDER_STOPPED` ·
`CONSOL_MATCHED` · `CONSOL_UNSURE` · `CONSOL_ORPHAN` · `PAYMENT_CONFIRMED` ·
`PAYMENT_MISMATCH` · `DO_ISSUED` · `CASE_CLAIMED` · `CASE_CLOSED` · `FLOW_ERROR`

### 4.5 `CD_Document` — documents on a case

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | |
| `AWB` | Text ✓ | |
| `DocType` | Text ✓ | from `CD_DocumentType` |
| `Format` | Choice | `PDF` / `DOCX` / `TIF` / `XLSX` / `OTHER` |
| `Visibility` | Choice | `CUSTOMER` / `INTERNAL` / `BROKER` |
| `Source` | Choice | `ACCS` / `CUSTOMER_UPLOAD` / `SYSTEM` / `IGM` |
| `FileId` | Text | SharePoint file id |
| `FileName` | Text | |
| `FileUrl` | Text | |
| `UploadedBy` | Text | |
| `UploadedAt` | DateTime | |
| `Required` | Yes/No | |
| `Received` | Yes/No | drives the checklist |

### 4.6 `CD_DocumentType` — what each clearance type requires · **CONFIG**

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | `{ClearanceType} · {DocType}` |
| `ClearanceType` | Text ✓ | `NFBRK` / `FEBRK-JEENA` / `FEBRK-SUNIMPEX` |
| `DocType` | Text ✓ | e.g. `INVOICE`, `BANK_DETAILS`, `DO_FORMAT`, `TARIFF_SHEET`, `CIRCULAR_08_2021`, `AUTH_LETTER` |
| `Mandatory` | Yes/No ✓ | |
| `PreTicked` | Yes/No ✓ | FedEx-supplied, so already satisfied `[L11]` |
| `SortOrder` | Number ✓ | |
| `CustomerVisible` | Yes/No | can the customer see it? |

**Seed from the real asset tree** `~/Developer/cargo-paf/Template/` `[verified]`:

| ClearanceType | DocType | PreTicked | Source file |
|---|---|---|---|
| `NFBRK` | `BANK_DETAILS` | Yes | `Template/NFBRK/BANK DETAILS.docx` |
| `NFBRK` | `DO_FORMAT` | Yes | `Template/NFBRK/DO FORMAT.docx` |
| `NFBRK` | `TARIFF_SHEET` | Yes | `Template/NFBRK/Celebi Tariff Sheet - Celebi Delhi Cargo Terminal_11zon.pdf` |
| `NFBRK` | `CIRCULAR_08_2021` | Yes | `Template/NFBRK/1323932251_Circular-No-08-2021.pdf` |
| `NFBRK` | `INVOICE` | No | from ACCS, per AWB |
| `FEBRK-JEENA` | `INVOICE` | No | from ACCS, per AWB |
| `FEBRK-SUNIMPEX` | `INVOICE` | No | from ACCS, per AWB |

**But that 7-row seed is the Delhi set, and it is incomplete.** `[verified]`
`doc 17 §1.6` — the **Kolkata / JFS** mandatory list is 7 items, verbatim, in order:

| # | DocType | Mandatory | PreTicked | Note |
|---|---|---|---|---|
| 1 | `KYC_FORM` | Yes | No | **+ supporting docs, self-attested, signed, stamped, photograph mandatory.** One-time. **Blocks the CHA** — §3.4.3 |
| 2 | `AUTH_LETTER` | Yes | No | **2 sets** of GATT / Import Declaration, **signed and stamped in original** |
| 3 | `COMMERCIAL_INVOICE` | Yes | No | + Packing List, **item-wise net *and* gross** weight, self-attested |
| 4 | `TECHNICAL_WRITEUP` | Yes | No | clarifying the item **along with end-use**, or catalogue |
| 5 | `BANK_AD_CODE` | Yes | No | authorised dealer code, verify with the bank |
| 6 | `IEC_GST_EWAYBILL` | Yes | No | IEC copy + GST copy **+ e-way bill** — three docs, one row |
| 7 | `DUTY_EXEMPTION_CERT` | Conditional | No | DSIR / CDEC, only if claiming exemption |

**Plus two conditional rules, which are not document rows — they are logic:**

| Rule | Trigger | Requirement |
|---|---|---|
| `EPR_CERT` | plastics waste, cargo e-waste, batteries | **Compulsory** — Plastic Waste Management Rules 2016 (as amended) |
| `LMPC_REGISTRATION` | pre-packed (ready-to-sell) commodities, weight-measuring equipment | Legal Metrology Packaged Commodities Rules |

These two are the ones that get missed, and missing them stops the BOE at the
gateway. They go in as **`CD_DocumentType.Condition`** — an expression the intake
evaluates per row, e.g.
`IsBlank(Commodity) || Or(Contains(Commodity,"battery"), Contains(Commodity,"e-waste"), Contains(Commodity,"plastic"))` → add `EPR_CERT`.
Nonsense produces nothing; a miss produces a stuck BOE. **Fail toward adding it.**

> **Open — O3.** Whether these lists are complete is a Workshop 2 question. Seed all
> three sets and mark every one `Mandatory=Yes` so nothing sends before it's reviewed.
> Every row carries a `Location` (`DELHI` / `KOLKATA` / `ANY`) and a `ClearanceType`
> so the pack builder can select rather than guess.

### 4.6.1 `Fee rule` — effective-dated, and location-keyed

The fee constants live in `CD_Setting` as flat keys, but they must not stay flat.
`doc 17 §1.7` `[verified]`: **three different "effective" dates** appear in the source.

| Constant | Value | Appears in |
|---|---|---|
| DO charge, day of arrival | ₹2,600.00 | every template, every PDF |
| GST @ 18% | ₹468.00 | every template, every PDF |
| **Total, day of arrival** | **₹3,068.00** | every template, every PDF |
| DO charge, next day onward | ₹2,600.00 (unchanged) | every template, every PDF |
| Admin fee, next day onward | ₹1,000.00 | every template, every PDF |
| GST on 3,600 | ₹648.00 | every template, every PDF |
| **Total, next day onward** | **₹4,248.00** | every template, every PDF |
| Kolkata FedEx CHA clearance | ₹3,000.00 + GST | template 3 only, *"from 5th of January 5, 2026"* — **typo in source** |
| Duty advancement | **2% of total duty & EDI charges, or ₹800, whichever is higher** | template 3 |
| THC / demurrage, customs duty, statutory | at actual | template 3 |
| Reactivation (docs after 30 days) | ₹5,000.00 | template 3 |

> **The ₹1,180 vs ₹4,248 trap.** Mails 4 and 5 say *"avoid the ₹1180/- admin fee"* while
> displaying a table totalling ₹4,248. **Both are right** — ₹1,180 is the *increase*
> (4,248 − 3,068), not a third fee. A template carrying the prose without the table, or
> the table without the prose, is a defect. This is the most likely thing to get wrong
> on screen and it is trivially caught in review: **render both, together.**

> **The unresolved one.** Three effective dates appear — **22-Nov-2023** (admin fee),
> **06-Jan-2025** (DO increase), **05-Jan-2026** (Kolkata clearance fee). The tables
> still show the **pre-increase** figures. **Whether the 06-Jan-2025 increase was ever
> applied is an open question for Compliance** — so `Fee rule` carries
> `effective_from` / `effective_to` and the rendered total always states which rule it
> came from. Never hard-code.

**Operating rules that belong in the same config**, all `doc 17 §1.8` `[verified]`:

| Rule | Value | System consequence |
|---|---|---|
| Demurrage starts | **48 h** after arrival in Delhi | drives the demurrage clock |
| Transfer to GMR Import Warehouse | **3 days** after arrival | excludes baggage, precious, cold storage |
| DO issue window | **09:30 – 17:30** | a DO request at 18:00 is tomorrow's |
| **No DO on** | **Second Saturday of every month**, + all Customs Holidays | needs the holiday calendar `[O11]` |
| DO collected by customer/CHA | *"responsible for the final delivery"* — not FedEx | must appear in the NFBRK mail verbatim |
| Photo ID | photocopy **compulsory** for DO collection | a document request of its own |
| Correspondence must cite | **AWB number and flight particulars** | every outbound mail, both parties |
| **Pre-arrival BOE** | may be filed **without MAWB** to avoid late penalty | §3.4.1 — why UBOND exists at all |
| Cold storage | collected at the Cargo Complex | — |

> **Pre-arrival BOE without MAWB is the strategic point of the whole product.** UBOND
> exists at 06:00 so the BOE can be filed before the CONSOL arrives at 08:00, thereby
> **avoiding the ₹5,000/day late-filing penalty**. That is the money argument, and it
> belongs on the Home screen next to the reminder count. It is not visible if you
> describe the app as *"sending nicer emails."*

### 4.7 `CD_Template` — the mail body · **CONFIG**

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | template key |
| `ClearanceType` | Text ✓ | |
| `SubjectPattern` | Text ✓ | `{AWB}` `{CONSIGNEE_NAME}` `{FREIGHT}` `{CURRENCY}` `{CASE_REF}` |
| `BodyContent` | Text ✓ | HTML, UPPERCASE placeholders `[C2]` |
| `CCEmails` | Text | semicolon-separated |
| `Broker` | Text | |
| `SubjectTagEnabled` | Yes/No | `[L1]` the `[{case_ref}]` suffix |
| `Active` | Yes/No | |
| `AttachmentsEnabled` | No | **hard-coded false. Not a preference.** `[L2]` |

**Subject formats** `[verified: cargo-pre-alert-operations-model.md:113,132,141]`:

| Template | Subject |
|---|---|
| FEBRK-Jeena / Sunimpex | `CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} \| FEBRK-DDP` (`-DDU` for Sunimpex) |
| NFBRK | `Pre Alert - {AWB} / {CONSIGNEE_NAME}` — *no fixed pattern in the wild; team varies it* |

**Jeena CC list, always present** `[verified]`:
`del-fedex.imports@jeena.co.in; madhikari@jeena.co.in; syogesh@jeena.co.in; adtaneja@jeena.co.in; sdutt@jeena.co.in; vjain1@jeena.co.in; ssingh@jeena.co.in; aanand1@jeena.co.in; kbihari@jeena.co.in; iphvdelcargo@corp.ds.fedex.com`

> **Known content bug `[C11]`:** the Jeena body text names *Sunimpex*. Fix before seeding
> any template body.

### 4.8 `CD_Case` — human work queue. Separate from `CD_Shipment`.

A *case* is a unit of **human attention**. A shipment generates 0..n cases.

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | `CASE-{seq}` |
| `AWB` | Text ✓ | |
| `Batch` | Text | |
| `CaseType` | Choice ✓ | `NEEDS_REVIEW` / `ESCALATED_REPLY` / `REJECTED_ROW` / `CONSOL_UNSURE` / `CONSOL_ORPHAN` / `PAYMENT_MISMATCH` / `FLOW_ERROR` / `CALL_TASK` |
| `Priority` | Choice | `P1` / `P2` / `P3` |
| `Reason` | Text ✓ | plain English, shown to the agent verbatim |
| `Fix` | Text ✓ | what the agent should do about it |
| `Status` | Choice ✓ | `OPEN` / `CLAIMED` / `RESOLVED` / `DISMISSED` |
| `ClaimedBy` | Text | |
| `ClaimedAt` | DateTime | |
| `ResolvedBy` | Text | |
| `ResolvedAt` | DateTime | |
| `ResolutionNote` | Text | |
| `SlaDueAt` | DateTime | |
| `CreatedAt` | DateTime ✓ | |
| `SourceMessageId` | Text | links back to `CD_Message` |

### 4.9 `CD_Message` — every inbound and outbound mail

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | |
| `AWB` | Text | null if unmatched |
| `Batch` | Text | |
| `Direction` | Choice ✓ | `INBOUND` / `OUTBOUND` |
| `Channel` | Choice | `EMAIL` / `PORTAL` |
| `Subject` | Text | |
| `Body` | Text | |
| `FromEmail` | Text | |
| `ToEmail` | Text | |
| `InternetMessageId` | Text | reply-matching key `[L1]` |
| `InReplyTo` | Text | |
| `MatchedBy` | Choice | `THREAD` / `CASE_REF` / `AWB_SENDER` / `FUZZY` / `UNMATCHED` |
| `Classification` | Text | see §10.4 |
| `Confidence` | Number | |
| `Path` | Choice | `AUTO` / `DRAFT` / `ESCALATE` / `IGNORE` |
| `Reason` | Text | why the classifier decided that |
| `RiskFlag` | Text | |
| `SentAt` | DateTime | |
| `AttachmentCount` | Number | **must be 0 on outbound** |

### 4.10 `CD_AIDecision` — classifier audit

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | |
| `AWB` | Text | |
| `MessageRef` | Text | → `CD_Message.Title` |
| `Path` | Choice ✓ | `AUTO` / `DRAFT` / `ESCALATE` / `IGNORE` |
| `Confidence` | Number ✓ | |
| `Reason` | Text ✓ | plain English |
| `RuleMatches` | Text | which rules fired |
| `RiskFlag` | Text | |
| `ClassifierVersion` | Text | `v1.0.0` `[verified: config.ts:8]` |
| `CreatedAt` | DateTime ✓ | |

### 4.11 `CD_AISummary` — the per-AWB case summary (new requirement)

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | AWB |
| `AWB` | Text ✓ | |
| `Pipeline` | Choice | |
| `SummaryText` | Text ✓ | 2–4 sentences, plain English, no jargon |
| `OpenItems` | Text | what's still missing |
| `NextAction` | Text | the single next step |
| `RiskLevel` | Choice | `NONE` / `LOW` / `MEDIUM` / `HIGH` |
| `GeneratedAt` | DateTime ✓ | |
| `ModelVersion` | Text | |

> **Status:** `[STUB]`. In Phase 1 the summary is **deterministically generated from
> the case state** — a template that reads status, missing documents, fee tier and
> reminder count. It is not an LLM call. Label it "generated summary" in the UI, never
> "AI summary", until O8 (InfoSec) clears a real model on shipment data.

### 4.12 `CD_Metric` — batch-wise funnel rollup

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | `{Batch} · {MetricName}` |
| `Batch` | Text ✓ | |
| `Pipeline` | Choice ✓ | `UBOND` / `CONSOL` |
| `MetricName` | Text ✓ | `ROWS_IN`, `ACCEPTED`, `REJECTED`, `SENT`, `REPLIED`, `DOCS_RECEIVED`, `CHECKLIST_COMPLETE`, `PAYMENT_CONFIRMED`, `DO_ISSUED`, `CLOSED` |
| `MetricValue` | Number ✓ | |
| `Denominator` | Number | so a rate is computable without a second query |
| `Percent` | Number | |
| `AsOf` | DateTime ✓ | |

See §11 for the exact metric set. This list is the answer to "how many docs did we
actually get back for that batch".

### 4.13 Remaining lists

**`CD_Task`** — `Title`, `AWB`, `TaskType` (`CALL`/`CHASE`/`REVIEW`/`DO`), `Owner`, `DueAt`, `Status`, `Priority`, `CreatedAt`, `CompletedAt`, `Notes`

**`CD_Participant`** — `Title`, `AWB`, `Role` (`CUSTOMER`/`IGM`/`CHA`/`BROKER`/`FEDEX`), `Name`, `Email`, `Phone`, `IsPrimary`

**`CD_Broker`** — `Title`, `BrokerCode`, `BrokerName`, `Rules`, `Active`. Seed: `JEENA`, `SUNIMPEX`, `OWN`.

**`CD_Attachment`** — invoice files staged before conversion. `Title`, `AWB`, `FileName`, `FileId`, `OriginalFormat`, `ConvertedFormat`, `ConvertedFileId`, `MatchQuality` (`EXACT`/`FUZZY`/`NONE`), `MatchNote`, `ConvertStatus`, `Error`. Logic from `match-attachments.ts` `[verified]`.

**`CD_Setting`** — **CONFIG**, key/value. `Title` = `SettingKey`, `SettingValue`, `ValueType`, `Description`, `IsSecret` (always No in Phase 1).

**Seeded `CD_Setting` rows:**

| SettingKey | Value | Note |
|---|---|---|
| `CD_TestMode` | `Yes` | master inert switch |
| `aiEnabled` | `Yes` | |
| `autoSendEnabled` | **`No`** | test mode forces this off |
| `followupEnabled` | `No` | |
| `callAiEnabled` | `No` | |
| `FeeArrivalDay` | `2600` | base, excl. GST |
| `FeeNextDay` | `3600` | base, excl. GST |
| `GSTPercent` | `18` | |
| `GSTArrivalDay` | `468` | `2600 × 0.18` |
| `GSTNextDay` | `648` | `3600 × 0.18` |
| `FeeTotalArrivalDay` | `3068` | |
| `FeeTotalNextDay` | `4248` | |
| `ReminderMaxCount` | `3` | |
| `Reminder1Hours` | `4` | T+4h |
| `Reminder2Hours` | `8` | T+8h |
| `DraftMinConfidence` | `0.7` | `[verified]` |
| `AutoSendRoutineMinConfidence` | `0.7` | `[verified]` |
| `AutoSendStrictMinConfidence` | `0.97` | `[verified]` |
| `SubBatchSize` | `25` | |
| `LinkExpiryDays` | `7` | |
| `PipelineA` | `UBOND` | |
| `PipelineB` | `CONSOL` | |
| `ClassifierVersion` | `v1.0.0` | |

---

## 4.14 The intake gate — we validate, we never resolve

The Excel arrives **already resolved** (§1.1). One person has done the VLOOKUP. Our
job is to **check that they did**, and fail closed when they didn't.

**There is no master list, no fuzzy matching, and no lookup engine in this product.**
We deleted them. The reasoning is in §1.1 — replacing an upstream prerequisite adds
no value, and a wrong auto-resolution is a customer-facing error that cannot be
withdrawn.

### 4.14.1 What the row must carry, or it does not send

Every row passes through this gate. It is deliberately short, because the upstream
Excel is reliable and the gate exists to catch the exceptions, not to re-derive.

| Field | If missing or bad | Why |
|---|---|---|
| AWB, 11–12 digits | **REJECT** | cannot be looked up, matched or tracked |
| `End Result` = NFBRK / FEBRK | **REJECT** | no template can be chosen |
| `FedEx Broker` = Jeena / Sunimpex | **`CHA_UNRESOLVED`** case | for FEBRK the broker **is** the CHA `[C4]` — nobody is appointed to file |
| Customer email | **REJECT** | nowhere to send it |
| `Location` = DELHI / KOLKATA | **default `DELHI`**, flag it | changes the fee table *and* the penalty clock `[C18]` |
| Anything not in the column map | **HOLD the row**, name the column | never silently drop data |

**Bare `FEBRK` with no broker is the one that must never auto-default.** It looks
like a complete row and it is not. For FEBRK, the broker is the party who files the
BOE — an unpopulated broker field means the shipment has no customs filer at all,
and nothing downstream will catch it. Route to a human with the fix: *"Broker
unresolved — FEBRK without Jeena or Sunimpex."*

### 4.14.2 The only precedence that matters

```
End Result  →  FedEx Broker  →  template + document pack + fee table
                     │
                     └── bare or missing ──▶ CHA_UNRESOLVED, never a default
```

That is the whole of it. Three fields, one branch, one escape to a human.

> **A new customer is a first-class outcome, not an error.** Upstream, an unresolved
> VLOOKUP means a phone call. We surface it as a `CALL_TASK` case with the AWB, the
> company and the question — *"broker type unknown, call for CHA preference"* — so the
> person making that call has the context. We route the work; we do not do the call.
> That is the correct division, and it is the whole `CALL_TASK` case type.

### 4.14.3 The call queue is a product surface, not a report

An unresolved row is **not a rejection and not a footnote.** For a new customer it is
the *expected* state, and the work it creates — a phone call — is real, recurring and
daily. It gets its own queue, its own screen (§8.14) and its own metrics (§11).

`CD_Task` holds the queue. One task per **company**, not per AWB — calling a customer
about their CHA once clears every shipment they have open. Ten open rows for one
new customer is **one phone call**, and a per-row queue would make the agent do it
ten times.

```
TaskType = CHA_UNRESOLVED
  CD_Case (1..n rows, one per AWB)  ──1:1──▶  CD_Task (one row)
```

`CD_Task` needs four fields this design adds, because the workflow is *linear and
phone-based* and a generic task list cannot express it:

| Column | Notes |
|---|---|
| `CallStatus` | `TO_CALL` → `IN_PROGRESS` → `CONFIRMED` / `CALLBACK` / `UNREACHABLE` |
| `CallbackDueAt` | the `CALLBACK` outcome must not vanish — it re-sorts to the top when due |
| `AwaitingSince` | how long this has been open. **The ageing clock is the real metric** |
| `AWBCount` | rows this single call unblocks — shown on the queue so the agent can see the value of the call |

**`CALLBACK` is the state that gets dropped in every implementation and it is the one
that matters.** The 10th call is the person who says *"call me back tomorrow."* If
that row is a `Reject` and the file is re-sent, the promise is lost. It must sit in
the queue with a date, and it must be the first thing on the queue at 09:00.

**`UNREACHABLE` is a business outcome, not a failure.** The shipment cannot progress
without the CHA, so it goes to `ESCALATED` with the exposure attached — never
silently retried forever, and never dropped.

### 4.14.4 Resolving after the batch has gone — the two paths

Both are needed. Neither alone is sufficient, and the second one is the common case.

```
              ┌─────────────────────────────────────────────┐
              │  a call returns, and the CHA is now known     │
              └──────────────────────┬──────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
   one company, one row?                         many companies?
              │                                             │
              ▼                                             ▼
   ┌──────────────────────┐                  ┌────────────────────────┐
   │ F27 · single resolve │                  │ F26 · re-upload Excel  │
   │                      │                  │                        │
   │ edit the case        │                  │ upload ONLY the still- │
   │ fill ChaName         │                  │ unresolved rows        │
   │ re-run pre-flight    │                  │ intake gate MERGES     │
   │ SEND                 │                  │ against open cases by  │
   │                      │                  │ AWB — never duplicates  │
   │ no Excel at all      │                  │                        │
   └──────────────────────┘                  └────────────────────────┘
              └──────────────────────┬──────────────────────┘
                                     │
                                     ▼
                    if the customer was ALREADY notified, they get
                    NOTHING new. The CHA gets F23 (§3.4.5) — a different
                    recipient, a different flow. The link just updates.
```

> **The re-upload is not a second batch.** It is an **upsert keyed on AWB**. The
> intake gate (§4.14.1) looks up every incoming row against open cases first and
> takes exactly one of five branches. Without that lookup, re-uploading a 25-row
> file after a call list will send 25 second pre-alerts to customers who already
> have one, and no amount of downstream care recovers that.

### 4.14.5 The five branches of a re-upload — this is the whole rule

| # | Existing case for this AWB | Action | Reason shown |
|---|---|---|---|
| 1 | **none** | create, normal flow | genuinely new |
| 2 | **`REJECTED`** | **revive — open a new case linked to the old one** | *the* legitimate re-upload: bare FEBRK, now resolved |
| 3 | **`BLOCKED`** at pre-flight | **update in place**, re-run pre-flight | never left the building |
| 4 | **`SENT`**, docs pending | **BLOCK.** Override requires a reason + an event | *the customer already has the request. You cannot un-send it.* |
| 5 | **`CLOSED`** / `DO_ISSUED` | **BLOCK.** No override | already finished |

**Branch 2 is why `REJECTED` is not a hard dead end.** The old case stays closed —
history is never rewritten — and the new one carries `SupersedesCaseId`. So the audit
trail shows *"rejected 09:00 bare FEBRK, re-uploaded 16:00 with Jeena, sent 16:10"*
without a single row being edited after the fact.

**Branch 4's override exists, and it is deliberately awkward.** It writes a
`RE_SENT` event, requires a free-text reason, and shows the customer their
`LastSentAt` next to the confirm button. If someone overrides it, they should feel
the weight. In practice it should be used twice a year.

### 4.14.6 What was removed, and how to get it back

If a decision is ever made to bring the lookup in-house, the design already exists and
is parked on disk:

```
~/dev/clearance-desk/sharepoint/prepare-clearance-master.py
```

It ports the Postgres `pg_trgm` matcher from `0040_clearance_fill_pg_trgm.sql` to
Python, precomputes `NameKey` / `TokenKey` / `PrefixKey`, and self-tests against 15
real names. 15/15 passing. **It is not referenced by this spec and nothing calls it.**

Reviving it costs one CSV import and one flow. Keeping it costs nothing but a
misleading file in the repo — so if the decision stays "upstream", delete it, and let
the absence be the record.


## 4.15 `CD_Participant` — a third-party registry, and the CHA columns

`CD_Participant` was specified as a flat list of participants. It is not: for cargo
it is a **registry of CHAs with an appointment state**, because the CHA is the party
who files. `[C4]`

| Column | Type | Notes |
|---|---|---|
| `Title` | Text ✓ | party name — `JEENA`, `SUNIMPEX`, or a customer-nominated CHA |
| `PartyType` | Choice ✓ | `BROKER` / `CHA` / `FEDEX_ADMIN` / `CUSTOMER` / `IGM` |
| `AppointedBy` | Choice | `FEDEX` / `CUSTOMER` — **this is the FEBRK/NFBRK split, in one column** |
| `Email` | Text ✓ | the assignment goes here |
| `Location` | Choice ✓ | `DELHI` / `KOLKATA` / `ANY` `[C18]` |
| `Active` | Yes/No ✓ | |
| `NominatedOn` | Text | when FedEx nominated them — drives `TimesUsed` |

**And on `CD_Shipment`, the three fields that make the chain auditable:**

| Column | Type | Notes |
|---|---|---|
| `ChaName` | Text | **FEBRK: copied from the broker. NFBRK: usually blank — the customer brought their own.** |
| `ChaAppointment` | Choice | `FEDEX_NOMINATED` / `CUSTOMER_NOMINATED` / `UNKNOWN` |
| `KycStatus` | Choice | `NOT_REQUIRED` / `REQUESTED` / `RECEIVED` / `VERIFIED` / `BLOCKED` |
| `BoeStatus` | Choice | `NOT_STARTED` / `WITH_CHA` / `FILED` / `CONFIRMED` / `OVERDUE` |
| `BoeFiledAt` | Text | **set from the CHA's confirmation only. Never computed from ACCS.** |
| `BoePenaltyExposure` | Number | ₹5,000/day days 1–3, ₹10,000/day from day 4, Delhi wording `[D6]` |

> **`BoeFiledAt` is evidence, not a derived value.** The moment any flow infers it from
> a document or an IGM field, the audit trail lies — and this is the field Compliance
> will be asked about. If the CHA has not confirmed, the value stays empty and
> `BoeStatus` stays `WITH_CHA`, however many documents have arrived. An empty
> `BoeFiledAt` with a complete checklist is a *valid and useful* state: it means the
> package is ready and we are waiting on the third party. Showing that honestly is
> more credible than a green tick we invented.

`BoePenaltyExposure` is a **calculation, not an entry** — `(days → rate)`, per
`Location`, per `[D6]`. It is the number the Home screen leads with (§3.4.5).

## 4.16 `CD_Case` — the CHA case types

Three case types exist only because of the CHA, and each has a different owner:

| CaseType | Trigger | Owner | Resolves when |
|---|---|---|---|
| `KYC_MISSING` | first contact, `KycStatus ≠ VERIFIED` | Customer | self-attested form + photograph received `[C4]` |
| `CHA_UNRESOLVED` | `FEBRK` with no named broker | **Agent** | broker selected (§5.3) |
| `BOE_OVERDUE` | penalty exposure accruing, no CHA confirmation | **CHA** | CHA confirms, or customer confirms |
| `DOCS_MISSING` | checklist incomplete | Customer | items received |

> **`BOE_OVERDUE` is the only case in the app waiting on a party we do not control and
> cannot chase.** The customer's CHA is a separate company. Every "send back to the
> agent" affordance on a `BOE_OVERDUE` case is dead on arrival — the reply comes from
> the CHA's own mailbox, possibly hours later, possibly never.
> **This is the case that will most often go quiet, and it must not be the one the
> dashboard hides.** It stays visible, ageing, with its penalty exposure, until a human
> closes it. Design it as expected-to-be-slow, not as expected-to-be-fixed.

---

## 5. STATE MACHINE

### 5.1 Case (`CD_Shipment.Status`)

```
NEW
 ├─ REJECTED ──────────────► terminal (reason + fix on the row)
 ├─ BLOCKED ──(operator fixes)──► READY
 └─ READY
     └─ PREFLIGHT ──┬─ PREFLIGHT_BLOCKED ──(fix)──► READY
                    └─ READY_TO_SEND
                         └─ SENT
                              └─ AWAITING_DOCS
                                   ├─ DOCS_COMPLETE ──(awaiting payment)──► AWAITING_PAYMENT
                                   │                                          ├─ PAYMENT_MISMATCH ──► NEEDS_ATTENTION
                                   │                                          └─ PAYMENT_CONFIRMED
                                   │                                               └─ DO_ISSUED ──► CLOSED
                                   └─ (3 reminders) ──► ESCALATED ──► CLOSED
```

Terminal: `REJECTED`, `CLOSED`. Everything else is recoverable.

### 5.2 Shipment vs case — do not conflate

`CD_Shipment` is **machine-owned state**. The agent does not move a shipment through
this machine. The agent acts on `CD_Case`. A case resolution may advance the shipment.

This is why `CD_Case` is a separate list. Without it, "claim a case" would mean
editing a row the flows are also writing, and on SharePoint the last write wins.

### 5.3 CLEARANCE TYPE — the only two inputs, and no guessing

The type arrives resolved (§1.1). We read two columns and combine them. Nothing else.

```
   "End Result"        "FedEx Broker"        →  template + pack + fee
   ─────────────       ───────────────
   NFBRK               (anything)           →  NFBRK · Delhi or Kolkata A/B
   FEBRK               JEENA                →  FEBRK-JEENA
   FEBRK               SUNIMPEX             →  FEBRK-SUNIMPEX
   FEBRK               bare / missing       →  CHA_UNRESOLVED, never a default
   missing             (anything)           →  REJECTED_ROW
```

**Bare `FEBRK` is not a resolution.** It is a rejection with a fix: *"Broker
unresolved — FEBRK without Jeena or Sunimpex."* `[C8]`

The broker column **only disambiguates within FEBRK.** It is never read for an NFBRK
row, because an NFBRK row's broker column is not about who files — for NFBRK nobody
is named at all, the customer brought their own (§3.4.1).

**There is no third source, and no history-based override.** An earlier draft had a
36k learned master outranking the typed value. That is gone with the rest of §4.14:
a value we did not type, from a table we do not own, silently overriding what the
operator actually put in the file. If the typed value is wrong, a human corrects the
file — and the case that produced tells us the file needs attention.

**Every resolution writes an event.** `TYPE_RESOLVED` or `TYPE_UNRESOLVED`, with the
two input values in the detail, so a template choice is always reconstructable from
the row it came from.

---

## 6. SOURCE DATA DEFECTS TO NORMALISE AT INTAKE

`cargo-paf/docs/cargo-pre-alert-operations-model.md:52-79` `[verified]`

| # | Column | Defect | Normalisation |
|---|---|---|---|
| D-1 | `Contact` | arrives as `9.19414E+11` — scientific notation, **loses precision** | strip, keep digits, flag for confirmation if ≠ 10 digits |
| D-2 | `Primary CEP` | arrives as literal `#N/A` | → blank |
| D-3 | `Standard Remarks` | semicolon-separated CC list, sometimes malformed | split, trim, drop empties, validate each has `@` |
| D-4 | `End Result` | `FEBRK` bare, with no broker | → `UNRESOLVED` + case. **Never** guess Jeena vs Sunimpex `[C8]` |
| D-5 | `PieceQty` / `MPS` | `MPS` may be pieces, packages or something else | leave blank, never show to customer, never compute on `[doc 20 §6]` |
| D-6 | `AWB Numbers` | 11 **or** 12 digits | accept both `[C19]`. Exactly-12 would reject 3 genuine shipments. |
| D-7 | `Freight` / `Value` | commas, currency symbols | strip to number, keep original in `RawJSON` |
| D-8 | `Primary CEP` vs `Team` | names contradict each other | shared-with, never owner `[C16]` |

**Rule:** never reject a row for a formatting defect. Normalise, flag, accept.
Reject only for: missing AWB, missing/!valid email, unresolvable clearance type.

**`RawJSON`** on `CD_Shipment` — store the untouched source row as JSON. It is the
only way to debug a normalisation bug after the fact. Add the column.

---

## 7. UBOND / CONSOL COLUMN MAP

### 7.1 Pipeline A — UBOND (27 columns) `[verified: operations-model.md:52-79]`

Header aliases come from `map-rows.ts` synonym lists `[verified]`.

| # | Source column | → `CD_Shipment` | Aliases accepted |
|---|---|---|---|
| 1 | `AWB Numbers` | `Title` | awb, awb no, airwaybill, waybill, mawb, hawb, fec number |
| 2 | `ConsigneeEmailID` | `ContactEmail` | email, consignee email, customer email, notify email |
| 3 | `Consignee Name` | `ConsigneeName` | consignee, cgnee, customer name, notify party |
| 4 | `End Result` | `ClearanceType` | end result, result, clearance type, clearance |
| 5 | `FedEx Broker` | `Broker` | fedex broker, broker, broker type, cha |
| 6 | `Contact` | → `CD_Participant.Phone` | contact, phone, mobile, contact no |
| 7 | `Standard Remarks` | `CCEmails` | remarks, cc, cc emails |
| 8 | `Agent` | `UploadedBy` | |
| 9 | `Loc` | — | site code |
| 10 | `Date` | — | sheet date |
| 11 | `BSO` | — | |
| 12 | `Freight` | `Freight` | |
| 13 | `Currency` | `Currency` | |
| 14 | `Data Type` | `Pipeline` discriminator | `CONSOL-01` ⇒ Pipeline B |
| 15 | `Mode` | — | `C` cargo |
| 16 | `PIN Code` | — | |
| 17 | `Duty Bill Account` | — | |
| 18 | `Value` | `InvoiceValue` | invoice value, cif value, cif |
| 19 | `PieceQty` | `Pieces` | pieces, pcs, pieceqty |
| 20 | `KiloWgt` | `Weight` | weight, kg, kgs, kilowgt |
| 21 | `AD CODE` | — | |
| 22 | `InstructionCD` | — | free text, shown in the case summary |
| 23 | `Commit date` | — | delivery deadline |
| 24 | `Account` | — | |
| 25 | `SQL Account Customer Name` | — | master-data name. **Display only — do not match on it** (§1.1) |
| 26 | `Primary CEP` | — | `#N/A` → blank |
| 27 | `Secondary CEP` | — | |

### 7.2 Pipeline B — CONSOL extra columns `[verified: map-rows.ts:112-120]`

| Source column | → `CD_Shipment` | Aliases |
|---|---|---|
| `MAWB` | `MAWB` | mawb, mawb no, master awb, master airwaybill |
| `IGM` | `IGMNumber` | igm, igm no, igm number |
| `Flight` | `Flight` | flight, flight no, flight number |
| `Origin` | `Origin` | origin, pol, port of origin |
| `Destination` | `Destination` | dest, pod, port of discharge |
| `HSN` | `HSN` | hsn, hsn code, tariff, hsn no |
| `Value` | `InvoiceValue` | |
| `Pieces` | `Pieces` | |
| `Weight` | `Weight` | |
| `Arrival Date` | `ArrivalDate` | drives the fee tier |

**Mapping UI:** the agent confirms the auto-guessed column map before the batch runs.
Never trust the guess silently. Show it, let them correct it, remember it per source.

---

## 8. SCREENS — 12 total

Build in this order. `compile_canvas` after each.

| # | Screen | Purpose | Depends on |
|---|---|---|---|
| 1 | `ScrHome` | today's numbers, kill switches, entry points | CD_Setting, CD_Batch, CD_Case |
| 2 | `ScrBatchUpload` | Pipeline A or B intake | CD_Batch, CD_Shipment |
| 3 | `ScrColumnMap` | confirm auto-guessed mapping | §7 |
| 4 | `ScrBatchBoard` | batch funnel, pre-flight, SEND | CD_Batch, CD_Shipment |
| 5 | `ScrAllCases` | **search + track every case** (new req) | CD_Shipment, CD_Case |
| 6 | `ScrNeedsAttention` | the claim queue, grouped by reason | CD_Case |
| 7 | `ScrCaseDetail` | one AWB in full, **incl. generated summary** | all |
| 8 | `ScrIGMPanel` | CONSOL entry, payment, DO | CD_Shipment |
| 9 | `ScrAIVsHuman` | what the system did vs what needs a person | CD_AIDecision, CD_Case |
| 10 | `ScrCustomerLink` | the customer's view | CD_Shipment, CD_Document |
| 11 | `ScrCHACallQueue` | **NEW** — the phone queue, §8.14. One row per company, keyboard-driven |
| `ScrBatchMetrics` | **batch-wise docs-received funnel** | CD_Metric |

### 8.1 `ScrHome` — 1366×768, tablet-first

```
┌──────────────────────────────────────────────────────────────────┐
│  Cargo Clearance Desk          [TEST MODE]  ●  AI  ●  Send  ●  FU │  header
├──────────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │   150  │ │   142  │ │   61   │ │   12   │ │    3   │          │
│  │ Rows in│ │  Sent  │ │  Docs  │ │ Need   │ │ Claimed│          │  stat row
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
│                                                                   │
│  [ Upload UBOND batch ]   [ Upload CONSOL batch ]                 │  primary actions
│  [ All cases ]  [ Needs attention (12) ]  [ AI vs human ]         │
└──────────────────────────────────────────────────────────────────┘
```

Stat tiles are **clickable** and filter the tab they open. Not decorative.

### 8.2 `ScrBatchUpload` — the intake

1. Pipeline toggle: `UBOND` (default) / `CONSOL`. **This choice changes everything downstream.**
2. Attach the Excel, or pick a file already in the shared-mailbox ingest folder.
3. Auto-guess column map → jump to `ScrColumnMap`.
4. Run validation. **Show accepted and rejected side by side**, each rejection with reason + fix. Never a summary count alone.
5. `ACCEPT AND CREATE BATCH` / `REJECT ALL`.

Hard validation rules:

| Rule | Action |
|---|---|
| AWB missing or not 11–12 digits | **REJECT** — "AWB missing or malformed" |
| `ContactEmail` missing or no `@` | **REJECT** — "Consignee email missing or malformed" |
| `End Result` bare `FEBRK`, no broker | **REJECT** — "Broker unresolved: FEBRK without Jeena/Sunimpex" |
| AWB already open in another batch | **REJECT** — "AWB already exists in batch {X}" |
| Any formatting defect D-1..D-8 | **ACCEPT + normalise + flag** |

### 8.3 `ScrBatchBoard` — pre-flight and send

Per-row pre-flight, not whole-batch. One bad row does not block 149 good ones.

| Check | Block? |
|---|---|
| Every placeholder in the template has a value | **YES** — per row `[C2]` |
| Clearance type resolved | **YES** |
| Recipient email valid | **YES** |
| Case ref appended to subject | no |
| Documents present in the pack | no (link is live even if empty) |
| Test mode on | no, but the Send button reads `SEND (TEST — NOTHING LEAVES)` |

Send runs in sub-batches of 25, paced. Show a live progress bar with a per-sub-batch
result. A failed sub-batch is retryable, and the rest keep going.

### 8.4 `ScrAllCases` — search and track (new requirement)

The workhorse screen. Agents live here.

- **Search** box: AWB, company, case ref, customer email. Debounced, matches across `CD_Shipment`.
- **Filter chips:** `All` · `My cases` · `Unclaimed` · `Open` · `Escalated` · `Awaiting docs` · `Awaiting payment` · `Closed today`
- **Gallery of cases**, each row showing: AWB · company · pipeline badge · status pill · fee tier · **docs received N/M** · reminder count · claimed-by.
- Sort by `UpdatedAt` desc default, and a `Needs me` sort.
- Tap → `ScrCaseDetail`.

### 8.5 `ScrCaseDetail` — the spine

Sections, top to bottom:
1. **Header** — AWB, company, clearance type, status pill, `CLAIM` button
2. **Summary** — generated plain-English summary + open items + next action (§4.11)
3. **Documents checklist** — required items, received ticks, upload-on-behalf
4. **Fee** — the tier, the arithmetic, and if it changed, *when and why it changed*
5. **Pre-alert** — template used, subject as sent, send state, pre-flight result
6. **Replies** — every inbound/outbound with its classification and path
7. **AI decisions** — confidence, reason, which rules fired
8. **Timeline** — append-only, newest first, actor on every row

### 8.6 `ScrAIVsHuman` — the differentiator

Two columns, side by side.

| System handled | Needs a person |
|---|---|
| Every `AUTO` classification | Every `ESCALATE` |
| Confidence ≥ 0.7 (routine) / ≥ 0.97 (strict) | Every case with a risk flag |
| Reason shown verbatim | Reason + suggested fix |
| Count + time saved estimate | `CLAIM` button inline |

Header strip: **"N auto-handled · M need a person · X% automated."**
The X is computed from real rows, not typed in. That number is the PPO headline.

### 8.7 `ScrCustomerLink` — what the customer sees

Token-gated, expiring, per-shipment. Converted invoice, fixed documents, upload
control, live checklist, fee with the tier explained, current status.

**No attachments anywhere on the outbound mail.** The link *is* the document delivery.

### 8.8 `ScrBatchMetrics` — the answer to "how many docs came back"

Per batch, both pipelines side by side.

```
Batch BATCH-20260930-0600-UBOND            [UBOND]
  Rows in                          150
  Accepted                         147   (98.0%)
  Rejected                           3    → 3 cases, grouped by reason
  Pre-alerts sent                 142
  Replied                          96   (67.6% of sent)
  ▸ NFBRK                     31/34  (91.2%)
  ▸ FEBRK-JEENA              38/52  (73.1%)
  ▸ FEBRK-SUNIMPEX           27/56  (48.2%)   ◀ worst, worth a conversation
  Docs received                 71   (50.0% of sent)
  Checklists complete           44
  Awaiting payment              19
  DO issued                       6
  Closed                         6
```

Broken out by clearance type, because that's the actionable cut. A 48% Sunimpex
response rate is a broker problem, not a system problem — and the screen should say so
by making the cut visible.

### 8.9 `ScrIGMPanel`

CONSOL entry (MAWB, IGM number, flight, arrival date), payment verification, DO issue.
DO PDF goes to the link, customer notified in thread, broker notified, case closed.

### 8.10 `ScrNeedsAttention`

Grouped by `CaseType`, then by reason. Each entry: reason, the fix, `CLAIM`, one-click
retry where retryable. This screen **is** the "never guess" rule made visible.

### 8.12 The CHA view — same link, different role

The customer link (§8.2) is role-aware. A CHA opening it sees the package, not the
marketing. **Same URL, same token, one link rule** — a second link type would mean a
second thing to expire and a second place to leak a token.

```
┌─ CLEARANCE PACKAGE · AWB 7XXXXXXXXXX ───────────────────────┐
│  Role: CHA (Jeena) · appointed by FEDEX · received 06:40       │
│  Flight: AI 161 / 12 SEP · MAWB pending — pre-arrival filing   │
├───────────────────────────────────────────────────────────────┤
│  BOE STATUS:  WITH CHA — awaiting your confirmation            │
│  ⚠  ₹10,000/day exposure from day 4 · Notification 34/2021   │
│                                                               │
│  DOCUMENTS (all present)                                       │
│   ✓ Commercial invoice      ✓ IEC / GST     ✓ Technical writeup│
│   ✓ Bank AD code            ✓ Auth letter   ✓ e-way bill      │
│                                                               │
│  [ MARK BOE FILED ]   [ DOCUMENTS MISSING — SEND BACK ]        │
└───────────────────────────────────────────────────────────────┘
```

**Two buttons, and the second one is why this works.** The historical CHA experience
is *"waits for forwarded documents from Trace, updates by phone or mail"*
(PRD §2.7). A CHA who finds a gap should be able to say so **in the system, in one
click, with the reason** — not phone you. That single button converts the slowest
loop in the process into a tracked case — and it is the strongest demo beat after the
one-click batch send, because the third-party lag is the hardest problem in cargo.

**`MARK BOE FILED` sets `BoeStatus = CONFIRMED` and stamps `BoeFiledAt` from the
click.** Nothing else may write that field (§4.15). If the CHA clicks it in error,
the case is reopened — a wrong *late* is far less costly than a fabricated *on time*.

The reply from the CHA arrives at the **shared mailbox** and matches by the case
reference in the subject tag `[L1]`, landing on the same case as the customer's
replies. One thread per AWB, regardless of who is talking.

### 8.14 ScrCHACallQueue — the phone screen

Twelve screens now. It is separate from `ScrNeedsAttention` because the work is
**linear, phone-based and stateful** — an exception review screen with a call list
bolted on the side will get used as a checklist, and a checklist is not a queue.

```
┌─ CHA CALL QUEUE ────────────────────────────────────────────────────┐
│  14 companies · 27 shipments blocked · awaiting broker confirmation   │
│  Oldest waiting 3 days.  ₹ 96,000 penalty exposure.                   │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ 1 CALLBACK DUE TODAY                                             │
│                                                                      │
│ ▶ ALPHA IMPORTS PVT LTD          4 AWB   waiting 3d 6h  ₹ 24,000     │
│      Kolkata · FEDEX_NOMINATED · KYC on file ✓                         │
│      "Confirm Jeena or Sunimpex, or your own CHA"                    │
│      [ CALL ]  [ CONFIRM JEENA ]  [ CONFIRM SUNIMPEX ]                │
│      [ CUSTOMER'S OWN CHA ]  [ CALLBACK — ]  [ UNREACHABLE ]          │
│                                                                      │
│   MERIDIAN TEXTILES               1 AWB   waiting 1d 2h   ₹  5,000     │
│   BHARAT ELECTRONICS              2 AWB   waiting 0d 4h   ₹ 10,000     │
│   ...                                                                   │
├──────────────────────────────────────────────────────────────────────┤
│  ⌨  Enter = call next    C = confirm broker    R = re-upload Excel    │
└──────────────────────────────────────────────────────────────────────┘
```

Six one-click outcomes, because the agent is **on a phone call and cannot type**.
`CONFIRM JEENA` / `CONFIRM SUNIMPEX` / `CUSTOMER'S OWN CHA` are the three real
answers; each one fills `ChaName`, `ChaAppointment` and unblocks every AWB on that
line at once.

**After a confirm, the row does not disappear — it collapses to a receipt and moves
below the fold.** *"Alphatronics · 4 AWB · Jeena confirmed 16:04 · 4 cases sent"*.
The agent needs to see that the call landed, and needs to be able to undo it if they
picked the wrong broker.

`R` re-uploads the Excel, feeding `F26` (§4.14.4). It is a *shortcut for the bulk
case*, not the main path.

### 8.15 Home — lead with money, not volume

`§3.4.5` — the product exists to avoid ₹5,000–10,000/day penalties by filing
pre-arrival. So the first number on Home is **penalty exposure at risk**, not
"rows processed":

```
┌──────────────────────────────────────────────────────────────┐
│  ₹ 1,47,000   BOE PENALTY EXPOSURE AT RISK                    │
│  across 31 shipments waiting on a CHA confirmation             │
│  ─────────────────────────────────────────────────────────    │
│  ▸ 2 confirmed BOEs today        ▸ 5 awaiting CHA reply        │
│  ▸ 11 documents complete         ▸ 13 still collecting          │
│                                                               │
│  Old way: 1.5 hours per 150 rows.  This: 3–5 minutes.         │
│  (source estimate — measure it before you quote it)            │
└──────────────────────────────────────────────────────────────┘
```

> **Do not lead with an efficiency number.** Lead with the exposure figure, then
> the 1.5-hour send baseline — which *is* `[verified]` (§1.1): 150 emails through
> Outlook, one at a time, ~1 minute each. It excludes the upstream VLOOKUP, so it is
> entirely ours to replace. An unverified savings claim is the fastest way to lose a
> PPO audience; a verified one from the source doc is the whole meeting.

---

## 9. USER FLOWS

### 9.1 Agent — morning intake (Pipeline A)

```
Home → [Upload UBOND batch] → attach Excel → ScrColumnMap (confirm guess)
      → validation runs → 147 accepted / 3 rejected (reasons shown)
      → ACCEPT → batch created, 147 cases in READY
      → [STUB] enrichment: ACCS called once for the batch, looped internally
      → intake gate (§4.14): types validated, not resolved
        145 carry a usable type, 2 are bare FEBRK → CHA_UNRESOLVED cases
      → docs: invoices matched to AWBs by filename, TIF→PDF
      → links generated, checklists built
      → BatchBoard → pre-flight: 142 pass, 5 blocked (with reasons)
      → SEND (TEST) → sub-batches of 25 → 142 sent
      → 5 blocked go to Needs Attention with fixes
```

### 9.2 Customer — receives and responds

```
Receives mail: subject + body + ONE LINK. Zero attachments.
Opens link → sees fee, checklist, status, uploads documents
Documents land → checklist ticks → "Thanks, we've received 3 of 4" auto-acknowledged
Replies by email → ingests to shared mailbox
```

### 9.3 System — reply ingestion and classification

```
Reply arrives at shared mailbox → Power Automate trigger
  → PRE-FILTERS (in order, silent absorb):
       1. out-of-office            → IGNORE
       2. mailer-daemon / bounce    → IGNORE
       3. internal (@fedex.com)    → IGNORE
  → MATCH to a case, in this ladder, first hit wins:
       1. THREAD      — InternetMessageId / In-Reply-To      → MatchedBy=THREAD
       2. CASE_REF    — [{case_ref}] in the subject          → MatchedBy=CASE_REF
       3. AWB_SENDER  — AWB in subject/body + sender matches → MatchedBy=AWB_SENDER
       4. FUZZY       — name similarity → "Unsure" queue     → MatchedBy=FUZZY
       5. UNMATCHED   → case in Needs Attention                → MatchedBy=UNMATCHED
  → CLASSIFY (§10.4)
       AUTO     → send the acknowledgement, write the event
       DRAFT    → create CD_Message draft + a case for review; agent clicks send
       ESCALATE → case in Needs Attention with the reason and the confidence
  → CustomerResponded = Yes on the shipment → reminder clock stops
```

> **Bug to not port `[verified: awb-extract.ts:5-25, ingest-email.ts:82]`.** The
> current code only accepts 12–15 digit AWBs and leaves `conversation_id` always null,
> so the thread ladder never fires and 11-digit AWBs are invisible. The ladder above
> fixes both. This is a genuine improvement over the working system — mention it.

### 9.4 Agent — claim and resolve

```
NeedsAttention → grouped by reason → reads the reason + fix
  → CLAIM  (ClaimedBy = me, ClaimedAt = now, Status = CLAIMED, one-click CAS)
  → works the case: approve a draft, normalise a bad row, confirm a fuzzy match
  → RESOLVE with a note → the flow advances the shipment
  → the event log records CLAIMED and RESOLVED with the actor
```

**Claim must be a compare-and-set**, not a blind write. Two agents clicking the same
case must not both think they own it. On SharePoint that means re-read-then-write
inside one flow action.

### 9.5 IGM — CONSOL and payment

```
IGM sends CONSOL Excel → Pipeline B
  → match to open cases: exact / unsure / orphan
  → exact rows enriched with MAWB, IGM no, flight, arrival date
  → fee tier recomputed; if it changed, the customer is told why
  → arrival notice reviewed and sent
  → customer pays → IGM verifies (O6 pending, manual for now)
  → DO issued → link updated → case closed
```

### 9.6 Case summary generation (new requirement)

Runs on every `CD_Shipment` write. Deterministic template in Phase 1:

> *"{AWB} — {Company}, {ClearanceType} via {Broker}, arriving {ArrivalDate}.
> Sent {SentAt}. Documents received {N} of {M}. Fee {FeeINR} ({FeeTier}).
> Reminders sent: {ReminderCount}. Last activity: {last event}."*

Plus `OpenItems` (what's missing) and `NextAction` (one step). A real LLM version
waits on O8.

---

## 10. FLOWS

Prefix every flow `CD_F##_`.

### 10.1 Registry

| # | Flow | Trigger | Real? |
|---|---|---|---|
| F01 | `CD_F01_ValidateAndCreateBatch` | File in `/Inbound/UBOND/` or manual | **REAL** |
| F02 | `CD_F02_EnrichFromACCS` | child of F01 | **STUB** — O5 |
| F03 | `CD_F03_MatchInvoices` | child of F01, one call per batch | **REAL** (file match) |
| F04 | `CD_F04_ConvertToPdf` | child of F03 | **PARTIAL** — `.tif`/`.xlsx` in, output stubbed for `.tif` |
| F05 | `CD_F05_ResolveTypeAndTemplate` | child of F01 | **REAL** |
| F06 | `CD_F06_BuildChecklist` | child of F05 | **REAL** |
| F07 | `CD_F07_GenerateLinkAndFee` | child of F05 | **REAL** |
| F08 | `CD_F08_PreflightScan` | before F09 | **REAL** |
| F09 | `CD_F09_SendPreAlert` | agent clicks SEND | **REAL**, test mode |
| F10 | `CD_F10_ConsolIntake` | file in `/Inbound/CONSOL/` | **REAL** |
| F11 | `CD_F11_ConsolMatch` | child of F10 | **REAL** |
| F12 | `CD_F12_SendArrivalNotice` | after F11 | **REAL**, test mode |
| F13 | `CD_F13_ReplyIntake` | Outlook trigger, shared mailbox | **REAL logic, seeded input** — O10 |
| F14 | `CD_F14_ClassifyReply` | child of F13 | **REAL rules**, no LLM — O8 |
| F15 | `CD_F15_ReminderSweeper` | recurrence 15 min | **REAL** |
| F16 | `CD_F16_PaymentCheck` | recurrence 30 min | **STUB** — O6 |
| F17 | `CD_F17_IssueDO` | IGM action | **REAL**, test mode |
| F18 | `CD_F18_ClaimCase` | agent clicks CLAIM | **REAL** — must be CAS |
| F19 | `CD_F19_ErrorHandler` | every flow's Catch | **REAL** — built first |
| F20 | `CD_F20_NightlyIntegritySweep` | nightly | **REAL** — §12 |
| F21 | `CD_F21_GenerateSummary` | on `CD_Shipment` change | **REAL**, deterministic |
| **F23** | **`CD_F23_CHAAssignment`** | **when the checklist completes, FEBRK only** | **REAL** — §3.4.5. One link, zero attachments, cites AWB + flight. Never fires on an incomplete checklist or without a named broker. |
| **F24** | **`CD_F24_BOEConfirm`** | **on CHA reply "BOE filed"** | **REAL** — §3.4.5. Records the confirmation. **Does not file anything.** |
| **F25** | **`CD_F25_KYCRequest`** | **on first contact, no KYC on file** | **REAL** — §3.4.3. One-time, self-attested, photograph mandatory. Blocks F23. |
| **F26** | **`CD_F26_ReuploadMerge`** | **on re-upload of a partial file** | **REAL** — §4.14.5. **Upsert keyed on AWB, five branches.** Branches 4 and 5 block. Never a duplicate send. |
| **F27** | **`CD_F27_SingleResolveSend`** | **one case confirmed on a call** | **REAL** — §4.14.4. Fill CHA → pre-flight → send. **No Excel involved.** The common case. |

### 10.2 Mandatory flow patterns

- **F19 first.** Every other flow calls it in its Catch. A system with no error path is not demoable — you will be asked "what happens when it fails?"
- **F19 writes:** a `CD_Case` of type `FLOW_ERROR`, an event `FLOW_ERROR`, and a plain-English message. Never a silent catch.
- **Never hardcode a connection reference.** Symbolic names mapped in the solution's connection references.
- Register every flow as a `RootComponent` of type 29.
- Wrap risky steps in a `Scope` with a sibling error scope on `runAfter: Failed`.

### 10.3 Quota discipline

```
WRONG   142 × "get invoice for AWB {x}"      = 142 flow runs
RIGHT   1   × "get invoices for batch {y}"   = 1 run, loop inside
```

150 rows × 3 batches = 450 cases/day. 450 runs is 15× the daily Power Automate
per-tenant allowance. This is not an optimisation, it is a design constraint.

### 10.4 Classifier — real thresholds

Ported from `cargo-paf/src/lib/ai/config.ts:5-18` and `classify.ts:365-404` `[verified]`.

```
IGNORE    out-of-office · bounce · internal
          → absorbed silently, no case, no event beyond a receipt

AUTO      confidence ≥ 0.7 (routine)  OR  ≥ 0.97 (strict pattern)
          AND urgency ∈ {low, normal}
          AND not VIP  AND no legal keyword
          → system sends, event REPLY_AUTO_HANDLED

DRAFT     0.7 ≤ confidence < autoSend threshold
          → draft written, case opened, agent clicks send

ESCALATE  below threshold  OR  risk flag  OR  dispute
          → case in Needs Attention with reason + confidence
```

`legalKeywords` `[verified]`: `attorney, lawsuit, compliance, legal notice, litigation, regulatory`

**Say this in the demo:** *the system automates what it is sure about and hands over
everything else.* That sentence is what makes it approvable for real use.

### 10.5 Reminder sweeper (F15)

| When | What | Detail |
|---|---|---|
| on send | clock starts | anchored to `SentAt` |
| **T+4h** | Reminder 1 | short, fee + link, nothing aggressive |
| **T+8h** or 2h before cutoff | Reminder 2 | penalty warning, fee tier restated |
| no response | `CALL` task | cargo new customers; a human calls |
| still nothing | supervisor escalation | visible on the queue |
| **customer responds** | **clock stops immediately** | the rule that makes it safe |

Hard cap 3. Respect cutoffs and holidays `[O11]`. Never fire at 23:55.

---

## 11. METRICS — the PPO headline

The chosen narrative is **manual effort eliminated**. These are the numbers, all
derived from `CD_Metric`, none typed in by hand.

| # | Metric | Baseline | Target | Source |
|---|---|---|---|---|
| 1 | Rows in → all pre-alerts sent | **1.5 h per 150** `[verified]` | < 10 min | `CD_Batch.CreatedAt` → `SendFinishedAt` |
| 2 | Exception mails typed by hand | 100% | 0% | cases with no template |
| 3 | New-customer calls per day | ~15–20 | < 5 | `CD_Task` type `CALL` |
| 4 | Replies handled without an agent | 0% | ≥ 60% | `CD_AIDecision` `AUTO` / total |
| 5 | UTRs matched automatically | 0% | ≥ 85% | **O6, Phase 2** |
| 6 | **Rows blocked on a CHA call** | ~4% | < 1% | call queue (§8.14) |
| 7 | **Oldest CHA wait** | unknown — nobody measures it | < 24 h | ageing clock, `AwaitingSince` |
| 8 | **Time batch → CHA confirmed** | unknown | < 4 h | the real end-to-end latency |
| 9 | **Callbacks honoured** | n/a | 100% | the `CALLBACK` state (§4.14.3) |
| 10 | First-response completeness | ~30% | ≥ 60% | closed after one customer action |
| 11 | Same-day DO rate | ~58% | ≥ 80% | `DO_ISSUED` on arrival day |
| 12 | Inbound matched to correct case | n/a | ≥ 98% | `CD_Message.MatchedBy` |
| 13 | **Docs received per batch** | — | measured | `CD_Metric` `DOCS_RECEIVED` / `SENT`, by pipeline **and** clearance type |
| 14 | **Time saved per batch** | — | measured | baseline 90 min − actual send duration |

> **Quote metric 1 from the source, not the PRD.** The `[verified]` figure is
> **1.5 hours for 150 emails**, and it is the *send only* — it excludes the upstream
> VLOOKUP (§1.1), so it is entirely ours to replace. The PRD's 2–4 h is an estimate
> and someone will ask which one is real.
>
> **Metrics 6–9 are the ones nobody has.** Oldest CHA wait, batch-to-confirmation, and
> callbacks honoured are all *unknown today* — not bad, unknown. Shipping with three
> measured numbers that did not exist last month is a stronger PPO story than a
> percentage improvement on a number that was already tracked.

**Batch-wise docs received is metric 13 and it's yours alone** — the PRD has no
equivalent. UBOND and CONSOL broken out by clearance type. That is a finding, not a
metric, and it is the thing that makes the deck yours rather than the system's.

---

## 12. SHAREPOINT CONSTRAINTS — design around these

| Constraint | Consequence | Mitigation |
|---|---|---|
| No field history | edits destroy the audit trail | `CD_ShipmentEvent` append-only; document the rule |
| No row-level security | every agent sees every case | acceptable for demo; **blocks pilot** |
| Last-write-wins | two agents can clobber | CAS on claim (F18); flows write, agents don't |
| No transactions | partial writes on failure | shipment first → verify → dependents; F20 sweeps orphans |
| 5,000 item view threshold | galleries break on big lists | filtered views + paging from day one |
| Delegated throttling | bulk ops get throttled | sub-batches of 25, retry with backoff |
| No choice-field validation | bad enum values possible | flows validate; UI shows `UNRESOLVED` not blank |

**F20 nightly integrity sweep** must find and report:
- shipments with a batch that no longer exists
- cases `OPEN` longer than 7 days
- events with a missing shipment
- `CLAIMED` cases with no `ClaimedAt`
- duplicate AWBs in the same pipeline
- links past `LinkExpiry` that are still live

---

## 13. BUILD ORDER

| # | Step | Gate |
|---|---|---|
| 0 | Provision SharePoint, seed `CD_Setting` + `CD_DocumentType` + `CD_Template` | `list_data_sources` returns 16 lists |
| 1 | `ScrHome` shell + kill switches | switches read `CD_Setting` |
| 2 | `CD_F19_ErrorHandler` | **before anything else** |
| 3 | `CD_F01` + `ScrBatchUpload` + `ScrColumnMap` | 150 rows validate, 3 reject with reasons |
| 4 | `CD_F05/F06/F07` — type, checklist, link, fee | 145 resolve, 2 block, and every `FEBRK` row names a broker |
| 5 | `ScrBatchBoard` + `CD_F08/F09` | pre-flight blocks only the 5 bad rows |
| 6 | **`CD_Shipment.Summary` + `ScrCaseDetail`** | the spine works |
| 7 | `CD_F13/F14` + `ScrAIVsHuman` — **seeded replies** | 3 paths all exercised |
| 8 | `CD_F18` + `ScrNeedsAttention` + `ScrAllCases` | claim is race-free |
| 9 | `CD_F10/F11/F12` — CONSOL, Pipeline B | merge, unsure, orphan all handled |
| 10 | `CD_F15` + `CD_F21` | reminders cap at 3, stop on reply |
| 11 | `ScrCustomerLink` | customer uploads, checklist ticks |
| 12 | `CD_F17` + `ScrIGMPanel` | DO issues, case closes |
| 13 | `CD_F20` + `ScrBatchMetrics` | the funnel renders |
| 14 | **`ScrCHACallQueue` + `CD_F27`** — the phone loop | 1 call unblocks 4 AWBs; all 6 outcomes work |
| 15 | **`CD_F23` + `CD_F24`** — CHA assignment, BOE confirm | link-only, no attachments, `BoeFiledAt` written once |
| 16 | **`CD_F26` + `CD_F25`** — re-upload merge, KYC | all 5 branches exercised, incl. both blocks |
| 17 | **Seed data + the 3 deliberate breakages** | §14 |

---

## 14. SEED DATA + THE DELIBERATE BREAKAGES

**Synthetic only.** Fabricated AWBs in a reserved non-shippable range, invented company
names, `example.com` recipients. The real `.eml` files and `cargo-paf` code are
**structure references** — copy the shape, never the data.

**Seed 3 batches:**

| Batch | Pipeline | Rows | Purpose |
|---|---|---|---|
| `BATCH-20260930-0600-UBOND` | UBOND | 150 | the headline funnel |
| `BATCH-20260930-1000-CONSOL` | CONSOL | 142 | the post-arrival merge |
| `BATCH-20260930-1400-UBOND` | UBOND | 96 | a second run, so "vs yesterday" is real |

**The 3 deliberate breakages. This is the credibility test.**

| # | Defect | Must surface as |
|---|---|---|
| 1 | missing MAWB on a CONSOL row | "Matched to case {AWB}, but MAWB absent — cannot generate arrival notice." Rejected, fix given. |
| 2 | 11-digit AWB | **Must be ACCEPTED**, flagged "11-digit AWB — confirm", not rejected `[C19]` |
| 3 | bare `FEBRK`, no broker | "Broker unresolved: FEBRK without Jeena or Sunimpex." Rejected, fix given. `[C8]` |

**If any of these is silently dropped, stop and fix it before showing anyone.**
A system that drops rows quietly is worse than no system, because people will trust it.

Also seed: 2 fuzzy CONSOL matches → "Unsure" queue · 1 CONSOL orphan → flagged, not duplicated · 3 replies hitting each of AUTO / DRAFT / ESCALATE · 1 out-of-office and 1 bounce, both silently absorbed · 1 legal-keyword reply forced to ESCALATE.

---

## 15. STUB REGISTER — say these out loud in the demo

| # | Stub | Why | Real when |
|---|---|---|---|
| 1 | ACCS enrichment | O5, no API | FedEx IT supplies read access |
| 2 | Reply trigger | O10, mail routing unapproved | Exchange admin |
| 3 | LLM classifier | O8, InfoSec | InfoSec clears Azure OpenAI |
| 4 | LLM case summary | O8 | same — Phase 1 is deterministic |
| 5 | Payment auto-match | O6, no bank feed | Finance/Treasury |
| 6 | `.tif` → PDF | no supported in-tenant service | Word Online or Azure Function |
| 7 | Live send | test mode | test mode off, O10 approved |
| 8 | Row-level security | SharePoint | Dataverse |
| 9 | Field history | SharePoint | Dataverse |
| 10 | Holiday calendar | O11 | Compliance |
| **11** | **BOE filing / ICEGATE** | **never — out of scope permanently** `[C4]` | **never. FedEx has no cargo licence.** |
| **12** | **KYC verification** | we collect, a human verifies | Compliance — the photograph and originals are self-attested |
| **13** | **CHA's own system** | the CHA works in theirs; we see a link and a reply | never |

> **Stubs 11–13 are different in kind from 1–10.** The others are *"not built yet"*.
> These are *"not ours"*, and that is the *correct* end state, not a gap. FedEx does
> not hold a cargo clearance licence, so the BOE is the CHA's legal responsibility on
> ICEGATE. Saying so plainly in the demo is the strongest credibility signal in the
> whole product — it shows you understand the boundary, and it pre-empts the obvious
> PPO question *"so are you replacing the CHA?"*
>
> **Answer, in one line:** *"No. We're the communication layer. ACCS, ICEGATE and the
> CHA do the customs work. We make sure the CHA has the right documents in front of
> them before the penalty clock runs out."*

---

## 16. OPEN QUESTIONS

**Blocking the showcase:** none — everything above is buildable now.

**Blocking the pilot:** O1 penalty citation · O2 Prior/Post split · O3 document pack
completeness · O5 ACCS · O6 bank feed · O8 InfoSec · O10 Exchange · O11 holidays ·
row-level security (needs Dataverse).

**Open product questions for you:**

1. **Do CONSOL batches re-send to customers who already got a UBOND pre-alert?** I've assumed yes — a different notice. Confirm.
2. **Should a CONSOL row with no matching UBOND case create a case, or a shipment?** I've assumed orphan shipment + flag, never a duplicate. Confirm.
3. **Does the customer ever pay through the link?** I've assumed no — link is documents + status only, payment stays with IGM. If there's a payment step, that changes `ScrCustomerLink` and adds a compliance question.
4. **`Calling` and `Hold` clearance types** `[verified: clearance-type.ts:2-8]` — in scope for Phase 1, or config-only? I've included them as choices but no flow.
5. **Who is allowed to claim a case?** Any agent, or team-scoped?
6. **Kolkata variant A vs B** `[doc 18]` — is *"FedEx CHA clearance"* (₹3,000+GST) still offered, and does a customer who picks it get a different document pack? I have modelled it as a choice, not assumed it is live.
7. **Does the CHA get its own login, or only the link?** The link-only design needs no CHA licensing and no InfoSec seat approval, so it is what I have specified. If CHAs need to *track* multiple AWBs at once, that becomes a portal and a security conversation `[O10]`.
8. **Is a CHA confirmed per shipment, or per batch?** I have assumed per shipment, because the BOE is per shipment.
9. **Should the NFBRK mail still list the eight FedEx contacts for appointing Jeena/Sunimpex?** `Template/NFBRK/nfbrk.md` does exactly that. If the link now captures the appointment, that paragraph is redundant — but it is also the current customer-facing behaviour, so removing it is a visible change.

10. **If a customer brings their own CHA, does the customer still get a pre-alert?** I have assumed yes — they get the document request, and nobody is notified to the CHA because nobody needs to be. So an NFBRK-with-own-CHA row closes its CHA branch with *no outbound third-party mail at all*. Confirm that is right, because it means the CHA mail (F23) only ever fires for FEBRK.
11. **Who is on the call queue by default?** All Trace Cargo agents, or one nominated person per shift? It changes whether the queue needs an owner column or not.

**Highest-value one is #7.** Link-only is dramatically cheaper to approve than a CHA
portal, and it is the difference between shipping in 6 weeks and 6 months. If CHAs
need multi-AWB visibility, raise it now, not at the security review.

---

## 17. MCP CHEAT SHEET

```
connect(environment_id: "Default-b945c813-dce6-41f8-8457-5a12c2fe15bf",
        app_id: "7bd4b8e4-2407-4918-acdd-f8ea72218851",
        environment_category: "prod",
        login_hint: "bipul.sikder@fedex.com")

sync_canvas(<clean yaml dir>)        # ONCE, before editing
list_controls()                      # confirm the connection
list_data_sources()                  # expect 10+ after provisioning
get_data_source_schema("CD_Shipment")
compile_canvas(<working dir>)        # after every screen
sync_canvas(<different dir>)         # to read back, never the working dir
```

**Gotchas that already cost time:**

- `sync_canvas` is a **pull**. It overwrites. Never call it on your working directory mid-build.
- `_EditorState.pa.yaml` exists and is not yours to edit. Leave it.
- If `compile_canvas` returns a validation error, fix and re-run. It validates **and** pushes — it is not a dry run.
- Keep the Power Apps Studio tab open with coauthoring on, or the MCP session drops.
