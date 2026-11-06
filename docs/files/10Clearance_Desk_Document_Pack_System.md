# Clearance Desk — Document Pack System

*How a document gets onto a customer's unified link, why the list is pre-ticked, and how the cargo team edits, deletes and adds to it before sending.*

*Implements decisions **L2** (link only, zero attachments), **L3** (historical `.eml` sets are truth), **L11** (both lists editable), **L12** (normalise to PDF/DOCX).*

---

## 1. The principle

**The mail is a notification. The link is the delivery vehicle.** Doc 7 §2 states this and decision L2 adopts it.

```
┌─ OUTBOUND MAIL ────────────────────────┐   ┌─ UNIFIED LINK /s/{token} ──────┐
│                                         │   │                                │
│  Subject:  CARGO ARRIVAL NOTICE- …     │   │  ● Timeline                    │
│            [CD-000142]                  │   │  ● Shipment details            │
│  Body:    3–8 lines of fact + deadline │   │  ● YOUR DOCUMENTS FROM FEDEX   │
│  CC:      CHA per template + Standard   │   │      ⤓ download each           │
│            Remarks                      │   │  ● DOCUMENTS WE NEED FROM YOU  │
│  Attach:  ██ NOTHING ██                 │   │      ⬆ upload box per item     │
│  Button:  [ View your shipment → ]      │──▶│  ● CHARGES (live, today)       │
│                                         │   │  ● [Submit] [Pay] [Approve]   │
└─────────────────────────────────────────┘   └────────────────────────────────┘
```

Everything the mail used to carry — the invoice, the DO format, the bank details, the circular, the KYC pack, the arrival notice — now lives on the link, as a **Document Pack** the agent has already curated.

**What this buys:**
- The link is bookmarkable; a lost mail costs nothing
- Documents update in place — the post-arrival notice replaces the pre-arrival one
- The customer uploads on the same page, so items tick automatically
- We stop sending 4–5 mails per shipment
- **No 4 MB attachment ceiling, no TIFF-in-Outlook problem, no "which of the 5 attachments is the invoice"**

---

## 2. Three concepts

| Concept | Table | What it is | Who edits |
|---|---|---|---|
| **Document Library** | `cd_doclibrary` | The pool of reusable documents. Versioned, effective-dated. Includes the **fixed** docs that never change. | Manager+ |
| **Document Pack** | `cd_docpack` + `cd_docpackitem` | A named, scoped set of Library docs + fetch rules that becomes the **pre-ticked list** on a case. | Manager+ defines; **Cargo/Team Lead edits per case** (L11) |
| **Access Rule** | `cd_accessrule` | Which audiences may see which document class. | Admin |

### 2.1 `cd_doclibrary`

| Column | Type | Example | Notes |
|---|---|---|---|
| `cd_doclibrary_id` | Guid (PK) | | |
| `name` | Text | `DO FORMAT` | |
| `file_name` | Text | `DO FORMAT.docx` | |
| `sharepoint_url` | Text | `https://…/Document Library/DO FORMAT.docx` | The master. Lives in SharePoint, versioned. |
| `format` | Choice | `pdf` \| `docx` | **Only these two are allowed** (L12) |
| `doc_class` | Choice | `do_format`, `bank_details`, `circular`, `tariff`, `kyc`, `authority_letter`, `brokerspecific`, `arrival_notice`, `commercial_invoice`, `duty_calculator`, `policy`, `other` | Drives access rules and portal grouping |
| `is_fixed` | Yes/No | Yes | "Never changes" — the requirement's "fixed doc that doesn't need changes at all" |
| `default_visibility` | Choice | `customer` \| `internal` \| `cha` | Pre-set on the pack item; overridable per case |
| `version` | Text | `v3` | |
| `effective_from` | Date | 2026-01-01 | |
| `effective_to` | Date | (blank) | |
| `superseded_by` | Lookup → self | | Set when a new version lands. Old version stays for audit of historical mails. |
| `is_active` | Yes/No | Yes | |
| `source` | Text | `cargo-paf/Template/FEBRK/Jeena/` | Provenance |
| `notes` | Multi-line | | |

> **Versioning matters here.** These documents go to customers and mention penalties, tariffs and bank details. If a tariff sheet is corrected in year two, the case that was sent with v1 must still be explainable. `effective_from`/`effective_to` plus `superseded_by` gives that.

### 2.2 `cd_docpack` + `cd_docpackitem`

**`cd_docpack`**

| Column | Type | Example |
|---|---|---|
| `cd_docpack_id` | Guid (PK) | |
| `name` | Text | `CARGO_PRE_NFBRK` |
| `description` | Text | NFBRK pre-alert — historical `.eml` set |
| `division` | Choice | `Cargo` \| `Courier` \| `IGM` \| (all) |
| `case_type` | Choice | `cargo_ubond` \| `cargo_postarrival` \| `courier` |
| `value_class` | Choice | `LV` \| `MV` \| `HV` \| (all) |
| `category` | Choice | (blank) \| courier defect category |
| `match_priority` | Int | 10 | Higher wins when several packs match. Lets a HV-specific pack override a generic one. |
| `is_default` | Yes/No | Yes | Applied automatically when no more specific pack matches |
| `is_active` | Yes/No | Yes | |

**`cd_docpackitem`**

| Column | Type | Notes |
|---|---|---|
| `cd_docpackitem_id` | Guid (PK) | |
| `cd_docpack_id` | Lookup | |
| `item_kind` | Choice | `library_doc` \| `fetch_rule` |
| `cd_doclibrary_id` | Lookup | When `library_doc` |
| `fetch_rule` | Choice | `accs_invoice` \| `generated_arrival_notice` \| `generated_do` \| `case_document` — when `fetch_rule` |
| `is_default` | Yes/No | **Yes = pre-ticked** (L11) |
| `is_mandatory` | Yes/No | Can it be removed entirely, or only unticked? |
| `default_visibility` | Choice | `customer` \| `internal` \| `cha` |
| `display_order` | Int | |
| `pack_label` | Text | Shown on the review tick-list, e.g. "Commercial invoice (from ACCS)" |

---

## 3. Pack resolution

Applied by **F22** when a case is created, and re-evaluated whenever the case's `clearance_type`, `value_class` or `category` changes.

```
FIND the matching pack:
  WHERE division      = case.division
    AND case_type      = case.case_type
    AND (value_class   = case.value_class  OR value_class  IS NULL)
    AND (category      = case.category     OR category     IS NULL)
    AND is_active      = Yes
  ORDER BY match_priority DESC
  TAKE TOP 1

IF none matched → use the is_default pack for the division/case_type
IF still none  → empty pack, and Needs Attention warns
                 "No document pack matches Cargo / cargo_ubond / HV. Link will have no documents."
```

**A broker-specific override is allowed.** L3 establishes that FEBRK-Jeena and FEBRK-Sunimpex historically carried *different* fixed documents. So a pack may be scoped further by `clearance_type`:

| Pack | case_type | clearance_type | value_class | priority |
|---|---|---|---|---|
| `CARGO_PRE_NFBRK` | `cargo_ubond` | `nfbrk` | — | 20 |
| `CARGO_PRE_FEBRK_JEENA` | `cargo_ubond` | `febrk-jeena` | — | 20 |
| `CARGO_PRE_FEBRK_SUNIMPEX` | `cargo_ubond` | `febrk-sunimpex` | — | 20 |
| `CARGO_PRE_FEBRK` | `cargo_ubond` | `febrk` | — | 10 | ← generic, the C8 case |
| `CARGO_PRE_HV` | `cargo_ubond` | — | `HV` | 30 | ← value-class override |
| `CARGO_PRE_MV` | `cargo_ubond` | — | `MV` | 30 |
| `CARGO_PRE_LV` | `cargo_ubond` | — | `LV` | 30 |
| `CARGO_POST_ARRIVAL` | `cargo_postarrival` | — | — | 20 |
| `COURIER_MISSING_CI` | `courier` | — | — | `category = Missing CI` |
| `COURIER_VALUE_CLARIF` | `courier` | — | — | `category = Value clarification` |
| … 12 courier packs | | | | one per defect category |

---

## 4. Seeded pack contents — the real data (L3)

Taken from `cargo-paf/Template/**/*.eml` and `cargo-paf/scripts`/migrations. **This is the authoritative list pending Workshop 2 confirmation (O3).**

### `CARGO_PRE_NFBRK`

| # | Pack label | File | Source format | Delivered as |
|---|---|---|---|---|
| 1 | DO format | `DO FORMAT.docx` | docx | **DOCX** (L12) |
| 2 | Bank details | `BANK DETAILS.docx` | docx | **DOCX** |
| 3 | Customs circular | `1323932251_Circular-No-08-2021.pdf` | pdf | **PDF** |
| 4 | Celebi tariff sheet | `Celebi Tariff Sheet - Celebi Delhi Cargo Terminal_11zon.pdf` | pdf | **PDF** |
| 5 | Commercial invoice | ⟦FETCH `accs_invoice`⟧ | **tif** | **PDF** (converted by F25) |

### `CARGO_PRE_FEBRK_JEENA`

| # | Pack label | File | Source format | Delivered as |
|---|---|---|---|---|
| 1 | Customs circular | `1323932251_Circular-No-08-2021.pdf` | pdf | **PDF** |
| 2 | CCI MEIS return | `CCI MEIS (2) JEENA.XLSX` | **xlsx** | **PDF** (converted) |
| 3 | KYC authorisation | `FEDEX KYC Authorisation.docx` | docx | **DOCX** |
| 4 | Jeena authority letter | `Jeena & Co Authority Letter.doc` | **legacy .doc** | **PDF** (converted) |
| 5 | KYC guidance | `New know-your-customer.pdf` | pdf | **PDF** |
| 6 | Commercial invoice | ⟦FETCH `accs_invoice`⟧ | tif | **PDF** |

### `CARGO_PRE_FEBRK_SUNIMPEX`

| # | Pack label | File | Source format | Delivered as |
|---|---|---|---|---|
| 1 | Customs circular | `1323932251_Circular-No-08-2021.pdf` | pdf | **PDF** |
| 2 | CCI MEIS return | `CCI MEIS-Sum impex.xlsx` | **xlsx** | **PDF** (converted) |
| 3 | KYC authorisation | `FEDEX KYC Authorisation.docx` | docx | **DOCX** |
| 4 | KYC guidance | `New know-your-customer.pdf` | pdf | **PDF** |
| 5 | Sunimpex authority letter | `Sun Impex Authority Letter.doc` | **legacy .doc** | **PDF** (converted) |
| 6 | Commercial invoice | ⟦FETCH `accs_invoice`⟧ | tif | **PDF** |

### `CARGO_POST_ARRIVAL`

| # | Pack label | Source | Delivered as |
|---|---|---|---|
| 1 | Arrival notice (with MAWB + IGM) | ⟦GENERATE⟧ | **PDF** |
| 2 | DO format | `DO FORMAT.docx` | **DOCX** |
| 3 | Bank details | `BANK DETAILS.docx` | **DOCX** |
| 4 | Commercial invoice | ⟦FETCH `accs_invoice`⟧ | **PDF** |

### `COURIER_{category}` — 12 packs, pending O4

To be defined in Workshop 1 from the courier team's best past mails. Expected shape:

| Pack | Pre-ticked FedEx docs | Customer's required uploads (item rule) |
|---|---|---|
| `COURIER_MISSING_CI` | Commercial invoice ⟦FETCH⟧, Arrival notice ⟦GENERATE⟧ | Commercial invoice, Packing list |
| `COURIER_INVOICE_OBJ` | Commercial invoice ⟦FETCH⟧ | Which field is wrong, Corrected invoice |
| `COURIER_CONTENT_DESCI` | Commercial invoice ⟦FETCH⟧ | Product name + function, HS code, Write-up / catalogue |
| `COURIER_DUTY_ROD` | Commercial invoice ⟦FETCH⟧, Duty calculator ⟦LIB⟧ | Accept duty yes/no, Reason, Payment contact |
| `COURIER_VALUE_CLARIF` | Commercial invoice ⟦FETCH⟧, AWB copy ⟦GENERATE⟧ | Correct value + currency, Reason, Corrected invoice |
| `COURIER_RBOE` | Checklist approval link ⟦GENERATE⟧, HV checklist ⟦LIB⟧ | KYC, Authority letter, IEC, GST, AD code |
| `COURIER_MOC` | Commercial invoice ⟦FETCH⟧ | FedEx or own CHA, CHA details |
| `COURIER_SVB` | Commercial invoice ⟦FETCH⟧, SVB circular ⟦LIB⟧ | Related party y/n, SVB order no., SVB order |
| `COURIER_DGCA` | Commercial invoice ⟦FETCH⟧, DGCA guidance ⟦LIB⟧ | Certificate/approval no., Certificate |
| `COURIER_CBE14` | Commercial invoice ⟦FETCH⟧ | Registration no., Validity, Certificate |
| `COURIER_PIMS` | Commercial invoice ⟦FETCH⟧ | Registration no., Certificate |
| `COURIER_PORT_RETURN` | Commercial invoice ⟦FETCH⟧ | Return/re-export/abandon, Address |

---

## 5. Pre-ticked lifecycle

```
 ┌─ Batch created (F01/F01b)
 │
 ├─ F02  ACCS enrichment → the case exists, clearance_type resolved
 │
 ├─ F22  APPLY PACK
 │      → resolution per §3
 │      → for each pack item, create a Document row:
 │            is_default     = Yes
 │            is_included    = Yes          ← PRE-TICKED (L11)
 │            visibility     = item.default_visibility
 │            doc_class      = item.doc_class
 │            pack_item      = item
 │            format         = pending
 │
 ├─ F24  FETCH the fetch_rule items
 │      → accs_invoice: bulk-fetch for the whole batch at once (doc 7 §2)
 │        loose AWB-in-filename → strict filename==AWB → fuzzy fallback
 │                                (ported from cargo-paf match-attachments.ts)
 │      → generated_arrival_notice: F06
 │      → generated_do: F13
 │
 ├─ F25  NORMALISE formats
 │      → .tif → PDF, .xlsx → PDF, legacy .doc → PDF
 │      → .pdf stays, .docx stays DOCX
 │      → everything lands in SharePoint /AWB/{awb}/FedEx/
 │      → Document.format, page_count, checksum written
 │
 ├─ AGENT EDITS  (on the Send/Review screen — the "pre-ticked docs" requirement)
 │      per AWB  |  selected rows  |  whole batch
 │      ☐ untick        ✕ delete        + add from Library
 │      + upload new (PDF/DOCX)          👁 change visibility
 │      → writes Document.is_included = No / deletes row / creates row
 │      → every change is an audited Document event
 │
 └─ F05  SEND
        → the mail references only the link (L2, zero attachments)
        → the link renders documents where is_included = Yes
                                     AND visibility = customer
                                     AND format in (pdf, docx)
```

### The agent's tick-list

```
┌─ Documents for AWB 874515906172 ────────── A R Polymers · NFBRK ────┐
│                                                                        │
│  PRE-TICKED (default from pack CARGO_PRE_NFBRK)                       │
│  ☑  Commercial invoice          Invoice_874515906172.pdf   PDF 2pp    │
│       ⟦from ACCS · fetched 06:12 · tif → pdf⟧                        │
│  ☑  DO format                   DO FORMAT.docx            DOCX      │
│  ☑  Bank details                BANK DETAILS.docx         DOCX      │
│  ☑  Customs circular            1323932251_Circular-…pdf  PDF 3pp   │
│  ☑  Celebi tariff sheet         Celebi Tariff…pdf         PDF 8pp   │
│                                                                        │
│  [ + Add from Library… ]  [ + Upload PDF/DOCX ]  [ Apply to: this AWB ▾ ]│
│                                                                        │
│  ── Changes ────────────────────────────────────────────────────────  │
│  ✓ unticked "Bank details"  — customer already has it on file         │
│  ✓ visibility internal       — "Celebi tariff sheet" (agent note)     │
│                                                                        │
│  Resulting link: 4 documents visible to customer, 1 internal           │
└────────────────────────────────────────────────────────────────────────┘
```

**"Apply to" scope — the bulk edit requirement:**

| Scope | Behaviour |
|---|---|
| `This AWB` | One case |
| `Selected rows` | The ticked rows in the current batch review grid |
| `Whole batch` | Every case in the batch |

This is the same operation as the Bulk Documents API `POST /batches/{batchId}/documents` (doc 11) — the screen and the API call the same flow, F24.

---

## 6. Format normalisation (L12)

**Rule: a customer only ever receives `pdf` or `docx`.** Nothing else exists on the link.

| Input | Origin | Converted to | By |
|---|---|---|---|
| `.tif` / `.tiff` | ACCS invoice | **PDF** | F25 |
| `.xlsx` / `.xls` | CCI MEIS sheets | **PDF** | F25 |
| `.doc` (legacy binary) | Broker authority letters | **PDF** | F25 |
| `.docx` | Library masters, DO format, bank details, KYC authorisation | **DOCX** (unchanged) | — |
| `.pdf` | Circulars, tariff sheets, KYC guidance, arrival notices, DO | **PDF** (unchanged) | — |
| `.jpg` / `.png` | Customer photo of a document | **PDF** | F25 (wrap) |
| `.zip` | Bulk upload from a customer | **rejected** — prompt to upload individually | F10 |
| anything else | — | **rejected**, logged | F25 |

### F25 implementation

```
DOC 7 §2.1 gives two options, in order:
  1. Word Online "Convert file"  — no extra build. TEST FIRST.
  2. Azure AI Document Intelligence
  3. Azure Function with the cargo-paf utif/pdf-lib logic  — best quality, most work

RECOMMENDED: build a small Azure Function now, because:
  • .xlsx → PDF is NOT something Word Online does well
  • legacy .doc → PDF is a real conversion Word Online refuses
  • Word Online needs an Office licence per conversion, which does not scale to
    a 500-AWB batch where every AWB has a TIFF invoice
  • cargo-paf's pool already proves the logic: BATCH_SIZE=25, WORKER_COUNT=4

The Function is a port of cargo-paf src/lib/tiff/{pool,zip}.ts logic, ~150 lines.
It does NOT go in a Power Automate flow.
```

**The `.docx` question — one explicit exception.** `DO FORMAT.docx` and `BANK DETAILS.docx` are delivered as **DOCX**, not PDF, because customers fill in and return them. Converting them to PDF would break the workflow. Every other document is PDF.

---

## 7. Visibility and access (L2's "access what to put in the unified link")

### `Document.visibility`

| Value | Portal | Agent app | CHA |
|---|---|---|---|
| `customer` | ✅ listed, downloadable | ✅ | ✅ |
| `internal` | ❌ **never** | ✅ | ❌ |
| `cha` | ❌ | ✅ | ✅ (if external sharing is approved) |

**`internal` is a hard exclusion.** It is not a CSS class or a UI toggle — the public document endpoint (doc 11) filters on it server-side. An `internal` document is never returned to a token holder, and the file URL is a time-limited SharePoint guest link, never a permanent one.

### `cd_accessrule`

Lets a Manager change what a given audience sees **without touching every pack**.

| Column | Type | Example |
|---|---|---|
| `cd_accessrule_id` | Guid (PK) | |
| `scope_type` | Choice | `division` \| `team` \| `role` \| `gateway` |
| `scope_value` | Text | `Courier`, `CD-RBOE`, `Agent`, `DEL` |
| `doc_class` | Choice | `commercial_invoice` \| `duty_calculator` \| `tariff` \| … |
| `action` | Choice | `view_portal` \| `download` \| `view_internal` \| `exclude` |
| `allow_deny` | Choice | `allow` \| `deny` |
| `case_type_filter` | Choice | (blank) \| `cargo_ubond` \| `courier` \| … |
| `is_active` | Yes/No | Yes |
| `notes` | Text | Why this rule exists |

**`deny` always wins.** Evaluation order: doc-level `visibility` → access rules (deny first) → default.

**Real examples of what this is for:**

| Rule | Effect |
|---|---|
| `division=Courier`, `doc_class=tariff`, `deny` | Courier agents' customers never get the cargo tariff sheet, even if a pack includes it |
| `gateway=DEL`, `doc_class=bank_details`, `allow` | DEL customers get bank details; a future BOM gateway does not until Finance publishes theirs |
| `role=Agent`, `doc_class=policy`, `view_internal` | Agents can see internal policy notes on the case, customers never can |
| `division=Cargo`, `doc_class=brokerspecific`, `allow` | A Jeena document is only ever offered to a `febrk-jeena` case, never to NFBRK |

**This is the "universal but access-controlled" requirement.** The portal page is one template for every division, every case type and every gateway. What renders on it is decided by `visibility` + `cd_accessrule` + the case's own required items — not by which page the customer landed on.

---

## 8. The customer's upload checklist (L11, second half)

The **Required items** checklist is a separate mechanism from the Document Pack, and it is **equally editable before send** (L11).

| | Document Pack | Required items |
|---|---|---|
| Direction | FedEx → customer | Customer → FedEx |
| On the portal | "YOUR DOCUMENTS FROM FEDEX" (download) | "DOCUMENTS WE NEED FROM YOU" (upload box) |
| Created by | F22, from `cd_docpackitem` | F03, from `Item rule` |
| Default | Pre-ticked (`is_default = Yes`) | From config, mandatory flagged |
| Editable before send | ✅ un-tick, delete, add, change visibility | ✅ remove an item, add an item, change mandatory |
| Source of truth | `cd_doclibrary` | `Item rule` |

**Both defaults come from configuration, and an agent can adjust either for a specific case before sending.** That is the whole point of L11: the team's real exceptions are handled without a config change and without a code change.

**Courier's category items** are listed in doc 6 §2.2. **Cargo's** in doc 6 §2.1 (12 items, with `Technical write-up` conditional on HS code and `EPR / LMPC` conditional on applicability).

**Conditional items** need a rule. `Item rule` gains:

| Column | Notes |
|---|---|
| `condition_field` | e.g. `contents`, `ad_code` |
| `condition_operator` | `contains` \| `equals` \| `is_empty` \| `not_empty` |
| `condition_value` | e.g. `HS 30` |
| `condition_else_item` | What to require when the condition is false |

So `Technical write-up` is required when `contents` mentions cosmetics/pharma HS codes, and `EPR / LMPC registration` when it doesn't. Resolved by F03 at case creation, then editable.

---

## 9. Storage layout

```
SharePoint site: "Clearance Desk DEL"
└── AWB Documents
    └── {AWB}
        ├── FedEx
        │   ├── 874515906172_Invoice.pdf            ← F24, tif→pdf
        │   ├── DO_FORMAT_v3.docx                   ← F22 from Library
        │   ├── BANK_DETAILS_v2.docx
        │   ├── 1323932251_Circular-No-08-2021.pdf
        │   ├── Celebi_Tariff_v1.pdf                ← visibility=internal
        │   └── ArrivalNotice_v2.pdf                ← F06, regenerated post-arrival
        ├── Customer
        │   ├── 874515906172_KYC.pdf
        │   ├── 874515906172_AuthorityLetter.pdf
        │   └── 874515906172_Invoice_revised.pdf    ← overwrites? NO — versioned
        ├── CHA
        └── Internal                               ← never exposed
```

- Every file in `Customer/` is **additive**. A revised invoice does not replace the original — the original is part of the customs record. `Document` rows are new, and `Required item` moves to `received` with a pointer to the newest.
- Every file in `FedEx/` is **replaced in place** with versioning, and the `Document` row points at the current version.
- The portal serves documents through a **short-lived SharePoint guest link** minted per request, never a stored permanent URL.

---

## 10. Flows

| Flow | Trigger | What it does |
|---|---|---|
| **F22** Pack apply | Child of F01 / F01b, and on `clearance_type` / `value_class` / `category` change | Resolve the pack per §3, create pre-ticked `Document` rows |
| **F23** Pack edit | Agent action on Send/Review screen | Apply untick / delete / add / visibility changes, at AWB, selection or batch scope |
| **F24** Bulk fetch | On send, or on demand | Fetch `accs_invoice` for the **whole batch at once** (doc 7 §2); filename matching loose → strict → fuzzy; register in `cd_docbulkrequest` |
| **F25** Format normaliser | Child of F24 and F10 | Normalise to PDF/DOCX per §6; reject anything else; write `format`, `page_count`, `checksum` |
| **F27** Documents API | HTTP trigger | The external surface — doc 11 |

**Every one of F22–F25 wraps its work in Try/Catch → F19**, so a failed fetch or a bad template is a row in `Needs Attention` with a plain-language reason, never a silent omission from the customer's link.

---

## 11. Errors the customer must never see

| Failure | Behaviour |
|---|---|
| ACCS returned no invoice for this AWB | Document row created with `is_included = No`, reason logged. The link shows the other documents. **The link is never empty because a fetch failed.** |
| A library file is missing from SharePoint | Pack item skipped, `Needs Attention` raised for Manager. Other documents still show. |
| Format conversion failed | Raw file **not** served. `Needs Attention` raised. Better an incomplete link than a corrupt download. |
| A pre-flight placeholder check failed | Case cannot be sent (C2). Link is not yet exposed. |
| Token expired | Portal shows an expiry message with a "request a new link" action that notifies the owning agent. It does **not** show a partial page. |

**The governing rule: the unified link must never be blank and never show an error to a customer. A missing document is an internal problem, handled in `Needs Attention`.**
