# Courier — Template Configuration

**Not a template.** This is the config table. The 2 templates in this folder read from it.
**11 categories → 2 shapes.** Verified against all 332 rows of `courier_pull_from_clerence.md`.

> `Master` holds 12 raw values. `CI Missing` and `Missing CI` are the same category and merge, giving **11** — locked decision C17 / D3 (doc 8). `R&R` (2 rows, `RETPP, EXPORT DOX REQD`) is the 11th.

> **Corrected.** An earlier draft had a third shape, "brief your broker", covering RBOE at 143 rows on the assumption that the customer files their own Bill of Entry. **That was wrong.** FedEx holds a courier clearance licence and files the BOE through its own Admin team (PRD §2.2, §2.5, FR-15). The data agrees: 332 of 332 rows mention a CHA or broker **zero** times, and **zero** rows tell the customer to file their own BOE. Shape C is deleted. CHA fields are gone from courier entirely.

---

## Why 2 shapes

The skeleton — greeting, shipment facts table, deadline, link, sign-off — is identical across all 11 categories. That part is written once and never repeated.

The **ask** splits cleanly in two, and it splits on what the customer physically does:

| Shape | What the customer must do | Reply to |
|---|---|---|
| **A** — Supply documents | Email or upload to FedEx | Courier desk |
| **B** — Confirm a figure | Reply with a number or a yes | Courier desk |

Nothing sits between these. There is no "the broker will act instead" case, because in courier there is no broker.

---

## The 11 configurations

`CI Missing` and `Missing CI` are one category (C17). Rows shown are the merged totals.

| # | Master | Rows | Shape | The ask | Why (customer-facing) |
|---|---|---|---|---|---|
| 1 | **RBOE** | 143 | **A** | Send the invoice in FedEx Excel format, plus any MOC confirmation | FedEx files the Bill of Entry once these are received |
| 2 | **CI Missing** | **92** | **A** | Send the commercial invoice | Customs cannot assess duty without it. *Merged: 83 + 9 (Missing CI)* |
| 3 | **PIMS** | 32 | **A** | Send invoice + end-use / catalogue detail | PIMS needs the item description to classify |
| 4 | **Invoice Objection** | 18 | **A** | Send the raised invoice / supporting papers | Dispute cannot proceed without them |
| 5 | **Content** | 17 | **A** | Send item description, catalogue, end-use | Packing list alone does not describe the goods |
| 6 | **Duty** | 13 | **B** | Confirm the assessed duty shown below | Duty assessed, awaiting customer confirmation |
| 7 | **CBE14** | 6 | **A** | Confirm the shipping-bill correction | CBE-14 cannot be filed until corrected |
| 8 | **Port Return** | 4 | **A** | Confirm return intent and raise a collection request | Port charges accrue while held |
| 9 | **Value Clarification** | 3 | **B** | Confirm the correct declared value | Under- or over-declaration both attract penalty |
| 10 | **MOC** | 2 | **B** | Confirm the change of consignee details | MOC needs consent to amend |
| 11 | **R&R** | 2 | **A** | Send the export documents | Return/refund cannot proceed without them |
| | | **332** | | | |

**Shape totals: A = 8 categories / 314 rows · B = 3 / 18 rows**

Verified: 143+92+32+18+17+13+6+4+3+2+2 = 332.

### RBOE detail

143 rows, but they are not 143 different asks:

| `Reason` | Rows |
|---|---|
| `RBOE` (bare, no detail) | **118** |
| `RBOE, EXCEL INVOICE REQ. IN FEDEX FORMAT` variants | 5 |
| `RBOE, MOC REQD.` / `RBOE, CONFIRM MOC` | 4 |
| `CI Missing` filed under RBOE | 10 |
| Invoice-address and invoice-number asks | 6 |

**118 rows carry no detail at all.** The template must not invent an ask for those. It states the case is pending with FedEx for Bill of Entry filing, lists the standard FedEx-format requirements, and asks the customer to confirm or correct. An agent enriches the 118 from ACCS before send — they are not a mail-template problem.

---

## Shipment facts block — shared by both shapes

Rendered from the case. Identical in both, so it is written once:

| Field | Source | Show in |
|---|---|---|
| AWB | case | A B |
| Consignee | case | A B |
| Origin → Destination | case | A B |
| Pieces / Weight | case | A B |
| Arrival date | case | A B |
| **Case-specific note** | `Reason` | A B |
| Duty assessed | case | **B only** |
| Value in dispute | case | **B only** |

**No CHA field. No broker field. No MAWB.** Those belong to cargo. See `templates/cargo/04` and `templates/cargo/11`.

---

## The `Reason` substitution list

82 distinct `Reason` values across the 332 rows. They are written for internal use and several are not customer-readable.

Raw examples: `ROD, DUTY CNF. RS. 21118.88/- (7.5, 10, 18) HS CODE 84484990` · `DESCI` · `REQD. DOCS, INV & KYC` · `CNEE REQD.` · `INV NOT OPEN` · `VAL CLAR.` · `MOC REQD.`

**Substitutions applied at render time:**

| Raw | Rendered as |
|---|---|
| `ROD` | *Receipt of documents* |
| `DUTY CNF.` | *Duty confirmation* |
| `DESCI` | *Description of items* |
| `REQD. DOCS` | *Required documents* |
| `REQD.` | *Required* |
| `CNEE REQD.` | *Consignee details required* |
| `INV NOT OPEN` | *Invoice not available/raised* |
| `VAL CLAR.` | *Value clarification* |
| `MOC REQD.` | *Amendment to consignee details required* |
| `CB14` | *Shipping-bill correction (CBE-14)* |
| `PT RTN` | *Port return* |
| `PIMS` | left as-is — a system name the customer knows |

**Amounts, HS codes and percentages are never altered** — they are reproduced exactly as recorded, because they are the operative content.

> The full 82-row table is generated into Dataverse as a lookup (`Reason substitution`) and reviewed in-app. It is not hand-maintained in this file.

---

## Where the case goes after the customer replies

Courier does not end at the customer. From PRD §2.2 and §2.5:

```
customer replies → Trace Courier desk (this template) → Clearance team → Admin team → BOE filed
```

The mail's only job is to obtain the document. Filing is internal, and the customer is not asked to arrange it.

---

## What stays out of both shapes

- **No attachment.** Documents are fetched from the secure link. See doc 8, L2 decision.
- **No agent name, extension or personal mailbox** in the body — sign-off is the desk name.
- **No request for the customer to file a Bill of Entry, or to appoint a broker.** FedEx files courier BOEs.
- **No claim of clearance or delivery date.** These are request mails; promising a date is a commitment the desk cannot make.
- **No escalation of tone by category.** Penalty facts appear only where they are statutory, and only on cargo.
