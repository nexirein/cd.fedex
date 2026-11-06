# Clearance Desk — Source Fidelity Contract

Version 1.0 · Compiled 2026 · **Design input for the build, not a customer-facing artefact**

---

## 0. What this document is

Every other document in this set says *what* the system does. This one records **what the source systems actually emit today** — the exact strings, the exact fee arithmetic, the exact column names, the exact PDF geometry — so that nothing gets re-invented during the build and nothing quietly drifts.

It exists because three separate source systems were found, and they disagree with each other and, in places, with the approved design:

| Source | Path | What it is |
|---|---|---|
| **cargo-paf** | `~/Developer/cargo-paf` | Next.js + Supabase pre-alert platform. Holds the real `.eml` customer mail in `Template/` |
| **web-app** | `~/Desktop/Fedex/Phase 1 /web-app` — *note the trailing space in `Phase 1 `* | Standalone Next.js notice generator. Draws branded A4 PDFs with `pdf-lib` |
| **Courier pull sheet** | `docs/files/courier_pull_from_clerence.md` | 22 columns × 332 rows. The division's **final split**, published to the team |

**Precedence:** this document records *observed source behaviour*. Where it records a defect, the system is built to the corrected rule, not the defect — and the correction is named. Where it records a live customer-facing string, that string is authoritative and must be reproduced (L3).

---

## 1. The post-arrival mail family

Six distinct mails, not one. They form a **sequence**, and the sequence is the point.

| # | Template | Source | When | Greeting |
|---|---|---|---|---|
| 1 | **NFBRK pre-arrival** | `Template/NFBRK/nfbrk.md` | Before arrival, customer appointed own broker | `Dear Sir/Madam,` |
| 2 | **CARGO ARRIVAL NOTICE → Pre Alert** | `Template/POST/cargo arrival notice pre alert/mail.md` | Before arrival, Delhi cargo-mode | `Dear Sir/Madam,` |
| 3 | **Kolkata / JFS clearance request** | `Template/POST/cargo arrival mail template.md` | Before arrival, Kolkata | `Dear Sir/Madam,` |
| 4 | **Same-day after IGM** | `Template/POST/1st mail of same day after igm generation/mail.md` | IGM generated | `Dear Sir/Ma'am,` |
| 5 | **1st-day reminder** | `Template/POST/1st day reminder mail/first day reminder mail.md ` — *trailing space in the filename* | DO not collected, end of day 1 | `Dear Sir/Mam,` |
| 6 | **2nd-day reminder** | `Template/POST/second day/mail.md` | DO not collected, day 2 | `Dear Customer,` |
| — | **ICEGATE — IGM not generated** | `Template/POST/script for IGM send/mail.md` | ICEGATE has not issued the IGM | `Dear Sir/ Madam,` |

There is also a broadcast, not a customer mail: **`Template/POST/TP hold.md`** — a Del Gateway TP-hold list (part arrivals, MSDS holds, BKC-letter holds) with columns `AWB · ORG · DEST · PCS ARRIVED · REASON · STAT · ARRIVAL SOURCE · ARRIVAL DATE`. Status codes `STAT44` and `STAT53` appear repeatedly and are **not documented anywhere** — flag as an open question, do not guess.

### 1.1 The DO collection instruction block (repeated verbatim in 1, 2, 3, 4, 5)

This block is duplicated across five templates with only the *branding* differing. It is the customer's payment instruction and it must survive character-for-character.

```
To release the online Delivery Order (DO), please provide below details on
Deldo@corp.ds.fedex.com:

  - authorization letter (in favour of Broker) from the Consignee Official Email-ID
  - D.O. payment through NEFT of INR 3068/- on the given FedEx bank account details

DO payment clear editable details — UTR/IMPS pasted on mail to deldo@corp.ds.fedex.com
```

The four fields the customer must supply, as they appear in the mails:

| Field | Notes |
|---|---|
| `AWB No.` | |
| `Consignee GSTNO` | **mandatory** — "Authority letter and GST details are compulsory" |
| `UTR NO - NEFT/IMPS Detail` | |
| `Remitter Account Name` | |

### 1.2 Subjects

| Template | Subject |
|---|---|
| 1, 2 | `CARGO ARRIVAL NOTICE -> Pre Alert \| TRK NO : {awb}, {company} \| NFBRK` |
| 2 (Kolkata variant) | `CARGO ARRIVAL NOTICE -> Pre Alert \| TRK NO : {awb}, {company} (FREIGHT :{freight} {currency}) \| NFBRK` |
| 3 | *(no subject in source — the system composes from the TRK NO line)* |
| 4, 5, 6 | *(no subject in source)* |
| ICEGATE | *(No subject)* |

**Every subject gets the L1 case-ref tag appended** — ` [{CD-000142}]`. Subjects 3–6 have no live subject in the source, so they need one authored at Phase 5 and confirmed with the team before go-live. They must not be invented silently.

### 1.3 Recipients found in the source

| Mailbox | Role | Appears in |
|---|---|---|
| `Deldo@corp.ds.fedex.com` | **DO collection and payment** — the single most important address in the whole family | 1, 2, 3, 4, 5 |
| `india@fedex.com` | Freight queries | 4, 5 |
| `iphvdelcargo@corp.ds.fedex.com` | CC on the Delhi pre-alert | 2 |
| `ccuiphvteam@corp.ds.fedex.com` | Kolkata CCU team | 3 |

> **Hard-coded broker escalation lists are a defect, not a contract.** Templates 1 and 2 name nine and six individual staff mailboxes respectively as the "FedEx Authorized Broker" escalation path, and they differ. This is the C11 pattern again. The new system resolves the broker mailbox from `cd_agentprofile` / config and **never** carries a personal address inside template text.

### 1.4 Bank details — CONFIG, NOT TEMPLATE TEXT

Templates 3 and the ICEGATE mail embed the full FedEx remittance block:

| Field | Value |
|---|---|
| Company | FedEx Express Transportation & Supply Chain Services (India) Pvt. Ltd. |
| Registered address | Boomerang, Unit No. 801, Wings A & B1, 8th Floor, Chandivali Farm Road, Near Chandivali Studio, Andheri (E), Mumbai – 400072 |
| Bank | Bank of America |
| Branch | A Wing, One BKC, G Block, Bandra Kurla Complex, Bandra (East), Mumbai 400051 |
| Account number | `72790060` |
| Account type | Current |
| IFSC | `BOFA0MM6205` |
| MICR | `400032002` |

> **These values appear here once, as a transcription of what the legacy mails say.** In the new system they live in a **`Payment detail`** config table owned by Finance, are rendered from config, and are **not** editable by an agent. They are payment-routing data; a template is the wrong home for them. The Mumbai registered address and the Delhi operating address are *different addresses* and both are correct in their context — do not merge them.

Payment rules, verbatim: **"We accept online payment only"** · **"No Cash or DD transactions."** · The DO and receipts are generated only **after** payment confirmation reaches the bank.

### 1.5 The BOE late-filing penalty (C18, resolved)

Both Delhi templates state:

```
As per Customs Notification no 34 / 2021 dated 29-03-2021, with immediate effect,
Bill of Entry needs to be filed by the end of the day of arrival of the shipment.

  1. Rs. 5,000.00 per day from the 1st day of the shipment arrival for 3 days.
  2. Rs. 10,000.00 per day from the 4th day onwards till the day of filing.
```

The Kolkata/JFS template states the same rates but starting **one day later** (5,000/day from day 2, 10,000/day from day 3). **Delhi wording is locked** (C18). Seeds `Fee rule.penalty_amount_1` / `.penalty_amount_2` per location.

**Still open (C7 residue):** the citation — 34/2021 or Circular 08/2021? Two different circular PDFs sit in `Template/NFBRK/`. The action deadline — the 3-hour window in the mail, or the 16:30 cutoff? These are *different* deadlines and the reminder engine must use the right one.

### 1.6 Document-request lists

**NFBRK / Delhi pre-arrival** asks the customer for clearance documents within **3 hours** of receipt. The Kolkata/JFS template asks for them within **1630 hours** — almost certainly a typo for **16:30**. Flagged, not silently fixed; confirm with the team.

**Kolkata mandatory list** (verbatim, in order):

1. KYC Form + supporting docs, self-attested — complete, signed, stamped, **photograph mandatory**. One-time. *Without KYC the CHA cannot complete clearance.* Share a FedEx account number if a signed contract exists.
2. Authorization letter; **2 sets** of GATT / Import Declaration, signed and stamped in original (format attached)
3. Commercial Invoice / Packing List with item-wise **net and gross** weight, self-attested
4. **Technical write-up clarifying the item along with end-use** / catalogue
5. **Bank AD code number** — mandatory, authorised dealer code, verify with the respective bank
6. **IEC copy and GST copy** — mandatory — and **e-way bill**
7. Duty-exemption certificate / notification (DSIR, CDEC) if claiming exemption

Plus two conditional notes:
- **EPR certificate** is compulsory for manufacturers and importers of **plastics waste, cargo e-waste and batteries** under the Plastic Waste Management Rules 2016 (as amended)
- **LMPC registration** is required for importing **pre-packed (ready-to-sell)** commodities and weight-measuring equipment

These are `Required item` rows (L11), pre-ticked and editable — not template prose.

### 1.7 Fee constants — the single source of truth

| Constant | Value | Where it appears |
|---|---|---|
| DO charge, day of arrival | **₹2,600.00** | every template, every PDF |
| GST @ 18% | **₹468.00** | every template, every PDF |
| **Total, day of arrival** | **₹3,068.00** | every template, every PDF |
| DO charge, next day onward | **₹2,600.00** (unchanged) | every template, every PDF |
| Admin fee, next day onward | **₹1,000.00** | every template, every PDF |
| GST on 3,600 | **₹648.00** | every template, every PDF |
| **Total, next day onward** | **₹4,248.00** | every template, every PDF |
| Late-fee **delta** | **₹1,180.00** | prose in mails 4 and 5 — *this is 4,248 − 3,068, not a third fee* |
| Kolkata FedEx CHA clearance | **₹3,000.00 + GST** | template 3 only, *"from 5th of January 5, 2026"* — *typo in source, "5th of January 5"* |
| Duty advancement fee | **2% of total duty & EDI charges, or ₹800, whichever is higher** | template 3 |
| THC / demurrage, customs duty, statutory | **At actual** | template 3 |
| Reactivation (documents after 30 days) | **₹5,000.00** | template 3 |

> **The ₹1,180 vs ₹4,248 trap.** Mails 4 and 5 say *"avoid the ₹1180/- admin fee"* while displaying a table totalling ₹4,248. Both are right — ₹1,180 is the **increase**. Rendering the prose without the table, or the table without the prose, is a defect. Templates must carry both, or a rewritten single figure.

**Never hard-code these.** All go in `Fee rule` with `effective_from` / `effective_to`, because at least three different "effective" dates appear in the source: 22-Nov-2023 (admin fee), 06-Jan-2025 (DO increase), 05-Jan-2026 (Kolkata clearance fee). The current tables still show the **pre-increase** figures, so whether the 06-Jan-2025 increase was ever applied is an open question for Compliance.

### 1.8 Operating rules — identical in both PDF families and the mails

| Rule | Value |
|---|---|
| Demurrage starts | **48 hours** after arrival in Delhi |
| Transfer to GMR Import Warehouse | **3 days** after arrival (excludes baggage, precious consignments, cold storage goods) |
| Cold storage charges | Collected at the Cargo Complex |
| DO issue window | **09:30 – 17:30** |
| No DO on | **Second Saturday of every month**, and all other Customs Holidays |
| DO release if customer/CHA collects | *"they will be responsible for the final delivery of the shipment"* |
| Clearance can be done by | *"you or your authorized licensed Customs House Clearing Agents"* |
| Photo ID | Photocopy **compulsory** for DO collection / issuance |
| Correspondence must cite | AWB number and flight particulars |
| Pre-arrival BOE | May be filed **without** MAWB to avoid late penalty |

The 3-day transfer rule and the 48-hour demurrage rule are the two the customer will care about most. They appear verbatim in both PDFs and must not drift.

---

## 2. The two branded PDFs

Both are A4 (`595.28 × 841.89` pt), drawn programmatically with `pdf-lib` — **not** Word-rendered. This corrects doc 12 F06, which assumed a Word template.

### 2.1 Shared design system

| Element | Value |
|---|---|
| Brand purple | `rgb(0.29, 0.11, 0.49)` — **#4A1C7D** |
| Tint (header/footer fill) | `rgb(0.94, 0.91, 0.97)` |
| Tint dark (borders) | `rgb(0.87, 0.82, 0.94)` |
| Link blue | `rgb(0, 0, 0.8)` |
| WhatsApp green | `rgb(0.14, 0.63, 0.32)` |
| Fonts | Helvetica + HelveticaBold only. **No Devanagari** — Hindi text is not renderable with the standard fonts |
| Page margins | 40 pt left and right |
| Logo | `/fedex-logo.png`, scaled to 80 pt wide |
| Header company | `Fedex Express Transportation And Supply Chain Services (India) Private Ltd` |
| Header address | `1st Floor, EICI Building, New Courier Terminal, IGI Airport, New Delhi -110037` |
| Document title | `CARGO ARRIVAL NOTICE` — centred, 14 pt bold, purple, underlined rule beneath |
| Section bars | Purple fill, 8.5 pt bold white text: `SHIPMENT DETAILS` · `CHARGES PAYABLE (Estimated)` · `BODY` / `IMPORTANT INFORMATION` · `NOTE` |
| Bullets | `•` in purple, 10 pt indent |
| Footer contacts | Cargo Services `18001033339` · Customer Care web form (link) · WhatsApp `+91 86558 31752`, *"Send \"Hi\" on WhatsApp"* · *"For any queries, please contact:"* |

### 2.2 `arrivalNotice` — the genuine post-arrival notice

**Body: the consignment *has arrived*.** Lodged at the **GMR Import Warehouse**, Delhi.

Consignee block is headed `CONSIGNEE NOTIFY` with a right-aligned `DATE: {date}`.

| Row | Fields |
|---|---|
| 1 | `MAWB NO` · `AWB NO` · `IGM NO` · `FLIGHT NO` |
| 2 | `ORIGIN` · `DESTINATION` · `FLIGHT DATE` |
| 3 | `PIECES` · `WEIGHT` (`{n} KGS`) · `PCS` — status code rendered as `T (All Pieces Arrived)` or `P (Partially Arrived)` |

Then `CHARGES PAYABLE (Estimated)`: `CHARGES COLLECT ON AWB` · `CARTAGE CHARGES` · `DELIVERY ORDER CHARGES` ₹2,600 · `SERVICE CHARGES` · `GST Charges 18%` ₹468 · **`TOTAL CHARGES PAYABLE` ₹3,068 (Rounded)**, in a tall highlighted total row.

Then eight bullets, including the Charges-Collect carve-out — *"a separate Demand Draft / Pay Order is issued for **AWB + 5% Charges Collect Fee**"*.

Then the `NOTE` late-collection table: `DAYS · DO CHARGES · ADMIN CHARGES · TOTAL CHARGES · GST @18% · TOTAL`, with rows `DAY OF ARRIVAL(CAN ISSUED DATE)` and `FROM NEXT DAY OF ARRIVAL`.

> **`PIECES` is unresolved.** The arrival notice prints `PIECES` to the customer, and the pull sheet's only candidate column is `MPS`, whose meaning is unconfirmed (doc 13 §5.8). **Slice 2 cannot ship a customer-facing `PIECES` value until the team confirms what `MPS` is.** The PDF also needs `WEIGHT`, and the pull sheet has **no weight column at all** — weight must come from ACCS (F02) or be entered manually. Flagged, not guessed.

### 2.3 `ubondConsol` — the pre-arrival prior intimation

**Despite the filename, this is a *prior intimation*, not an arrival notice.** It opens *"your shipment is scheduled to arrive in Delhi shortly."*

Consignee block is headed `CONSIGNEE` with a right-aligned `NOTICE DATE`.

| Row | Fields |
|---|---|
| 1 | `AWB NO.` · `COMMIT DATE` |
| 2 | `PIECES` · `WEIGHT` (`{n} KGS`) |
| 3 | `DECLARED VALUE` (`INR {value}`) · `FREIGHT` (`{currency} {freight}`) |

Then an `i`-badge callout: *"This is to inform you that your shipment is scheduled to arrive in Delhi shortly. Kindly initiate your Customs clearance process (file Bill of Entry) and obtain the Delivery Order (DO) accordingly for smooth clearance upon arrival."*

Then `CHARGES PAYABLE (Estimated)` with the same five lines, total row labelled **`TOTAL AMOUNT PAYABLE (Estimated)`** ₹3,068 with a `(Rounded)` sub-line.

Then `IMPORTANT INFORMATION` — ten bullets, including a live link to the **Air IGM status** page and the BOE/DO-in-advance instruction.

> **Naming must be corrected in the new system.** `ubondConsol` → something like `PRIOR_INTIMATION`; `arrivalNotice` → `ARRIVAL_NOTICE`. The current filenames invert the content and will cause a wrong-document send if carried over.

### 2.4 MAWB cell parsing

The generator accepts a single free-text cell and parses it:

```
/MAWB[-\s]*(\d+)\s+(\d+)\s*,?\s*IGM[-\s]*(\d+)\s*,?\s*Flight[-\s]*([^,\s]+)\s*,?\s*Dt\s*-?\s*(.+)/i
```

It accepts optional separators, and normalises the flight date from either `DD-MM-YYYY` or `DD MonthName YYYY`. This tolerance is deliberate and should be preserved — pasted text from a mail client is not reliably formatted.

### 2.5 Implementation note for the Microsoft build

There is no `pdf-lib` in Power Platform. Three viable routes:

| Route | Fit | Verdict |
|---|---|---|
| **HTML/CSS → PDF** via a Power Apps PDF generation / Azure Function Chromium headless | Exact control over the purple grid, the total row, the icon badges, and the live links | **Recommended.** Closest to the source fidelity, and the links stay real |
| Word template → PDF | Matches doc 12 F06's original assumption | Rejected — the source is drawn, not templated, and Word will not reproduce the grid or the SVG icon badges |
| SharePoint/Power Automate "Convert to PDF" | Cheap | Rejected — cannot express this layout |

**The `.docx` route is only correct for the fillable fixed documents** — the DO authorisation format and the bank-details sheet — which is consistent with L12. Those are documents a human fills in, not designed artefacts.

---

## 3. Courier pull-sheet contract

Full contract in **doc 12 §2.10**; schema in **doc 13 §3.2.1**, assignment and `CEP` resolution in **doc 13 §2.3**. This section records only what the analysis found.

### 3.1 Shape

22 columns, **332 data rows**, every row exactly 22 fields. No duplicate AWBs, no duplicate company+AWB pairs.

### 3.2 Desks and people (D4)

| Team | Agents | Rows | MV / HV / LV |
|---|---|---|---|
| `BOM` | *(pool)* `BOM` 62 · *(pool)* `BOM CEP` 3 | **65** | 2 / 63 / 0 |
| `CEP` | Vaibhav Srivastava 16 · Shikha Sharma 15 · Sangeeta 10 · Neha Sambhyal 9 · Pooja Rajput 8 | 58 | 23 / 30 / 5 |
| `Invoice` | Anil Kumar 69 | 69 | 54 / 0 / 15 |
| `RBOE` | Vijay Kumar 10 · Deepak Pal 9 · Khushboo 9 · Mahavir Kumar 9 · Manan Ghai 9 · Shweta Nagwal 9 | 55 | 4 / 51 / 0 |
| `SD` | Sachin John 28 · Harsh James 19 · RP Singh 19 · Shreya Pramanik 19 | 85 | 75 / 0 / 10 |
| | **16 named people + 2 pools = 18 `Agent` values** | **332** | 158 / 144 / 30 |

A count of 18 *agents* is right. A count of 18 *people* is wrong — two of the eighteen are desk labels, and the 16 people are the union of all five desks' rosters, not 18 individuals in one queue.

Where `RBOE` is the **`Master` category**, it is HV on all 143 rows. That is a different statement from the RBOE **desk**, which handles 51 HV and 4 MV. `SD` and `Invoice` **never** handle HV. This is real policy showing through the data, and it seeds `cd_team.value_class_scope` (doc 13 §2.1).

### 3.3 Categories (D3)

`Master`, 12 values — but `CI Missing` (83) and `Missing CI` (9) are the same category, so **11**:

`RBOE` 143 · `CI Missing` 83 · `PIMS` 32 · `Invoice Objection` 18 · `Content` 17 · `Duty` 13 · `Missing CI` 9 · `CBE14` 6 · `Port Return` 4 · `Value Clarification` 3 · `MOC` 2 · `R&R` 2

`Reason` prefix, 14 codes — the token before the first `,` or `;`, upper-cased:

`RBOE` 126 · `CI MISSING` 93 · `PIMS` 31 · `INVIC` 21 · `DESCI` 18 · `ROD` 13 · `INVMS` 10 · `MOC` 6 · `PFEXP` 4 · `VALDS` 3 · `DGCA` 3 · `SVB` 2 · `EXP_DOCS` 1 · `RETPP` 1

**The two columns do not share a vocabulary**, so a raw string comparison flags **173 of 332 rows** as disagreeing. It is not a vocabulary difference on 173 rows — it is a vocabulary difference on most of them. Mapping the twelve code↔label pairs (`INVIC`≡`Invoice Objection`, `DESCI`≡`Content`, `ROD`≡`Duty`, `CI MISSING`≡`CI Missing`, `INVMS`≡`Missing CI`, `PFEXP`≡`Port Return`, `VALDS`≡`Value Clarification`, `DGCA`≡`CBE14`, `SVB`≡`CBE14`, `EXP_DOCS`≡`R&R`, `RETPP`≡`R&R`) brings the real conflict count to **19 rows (5.7%)**:

| `Reason` prefix | `Master` says | Rows |
|---|---|---|
| `CI MISSING` | `RBOE` | 10 |
| `MOC` | `RBOE` | 4 |
| `INVIC` | `RBOE` | 2 |
| `INVIC` | `PIMS` | 1 |
| `DESCI` | `CBE14` | 1 |
| `INVMS` | `RBOE` | 1 |

`Master` wins. The map is seed data, not code, and the Phase 1 test asserts the count is 19 — a regression here is silent and the only symptom is that the system stops telling anyone when it is unsure.

Compound prefixes exist and must be split correctly: `DESCI;SVB`, `DESCI;ENDUS`, `INVIC;PIMS`. The separator is `;` as well as `,`, and a naive comma split turns `DESCI;SVB` into one unknown code.

### 3.4 `EDI` is a status column, not metadata

`CHECKLIST_SENT_E` 115 · `CI Missing` 93 · `PPW CALLING` 121 · `CHECKLIST_SENT` 3.

The two `CHECKLIST_SENT*` values — **118 rows** — mean a checklist has already gone out. The new system must **not** request one again. This is the single most valuable thing in the sheet, because a duplicate checklist to a customer is a visible error.

### 3.5 `CEP` is a name list, and most of it resolves to nobody

This is the finding that most changes the build, so it gets its own section.

84 rows carry a value in the `CEP` column. Those 84 values are **23 distinct cells** which name **21 individual people** (a cell may list up to three, separated by `/`). Resolving them against the `Team` / `Agent` roster:

| | Count | Names |
|---|---|---|
| Exact match to a rostered agent | 5 | `Mahavir Kumar`, `Neha Sambhyal`, `Pooja Rajput`, `Shikha Sharma`, `Vaibhav Srivastava` |
| Match after stripping an honorific | 1 | `Sangeeta Ms` → `Sangeeta` |
| **No match at all** | **15** | `Ahil E` · `Aneesh T. P.` · `Anthony Gonsalves` · `Bhaskar M` · `Darain Saad` · `Dhwani Adhia` · `Ganesh Vadhavkar` · `Kavitha Essakimuthu` · `Maxim Martha` · `Nimesh Shah` · `Prashant Kamble` · `Royden John Rebeiro` · `Sayed Ibrahim Azeem` · `Sunita Surendra Sharma` · `Tejas Shenvi` |

**43 of the 84 rows contain at least one unresolvable name.** `Bhaskar M`, `Dhwani Adhia` and `Nimesh Shah` each appear on 8 rows, so these are established working relationships across desks — not typos, and not a data-quality problem to be cleaned away.

Three consequences for the build, all locked (doc 8 C16, contract in doc 13 §2.3.1):

1. **`assignee_agent_id` is nullable on a share row.** An unresolved name is written down verbatim in `source_label` so it can be reviewed and retried, not discarded.
2. **The system never creates an agent from a string in a data cell.** `Sangeeta Ms` is exactly why: the same human is `Sangeeta` in one column and `Sangeeta Ms` in another. A matcher that silently normalised that away would be asserting an identity, and identity is what grants access.
3. **A share never blocks a send.** It grants read access. A clearance notice that does not go out because a distribution list had a typo in it is a worse outcome than a colleague not being copied.

### 3.6 Data traps, all real
| Trap | Count | Handling |
|---|---|---|
| 11-digit AWB | 3 | Accept with `awb_length_warning` (D7) |
| `Cmit Date` = `31-Dec-99` | 1 | `commit_date_is_sentinel` — **passes a naive date regex, so test the year** |
| Double spaces in `Company` | 13 | Trim into the normalised key, keep raw for audit |
| `Manifested mail` empty | 332/332 | Dead column; the new system writes it |
| `MPS` meaning unknown | 332 | **Blocks `PIECES` in the arrival notice** — doc 13 §5.8 |
| No weight column at all | — | `WEIGHT` must come from ACCS or manual entry |
| `CEP` names unresolvable | **43 of 84 rows** | 15 of 21 names match no profile. `cep_name_unresolved` warning; never auto-provision; never blocks a send — doc 13 §2.3.1 |
| `Master` vs `Reason` vocabularies | 173 → **19** | Conflict must be counted through the equivalence map, or the warning fires on 52% of rows and stops being read |

**Not a trap, despite looking like one:** `Cmit Date` earlier than `Flight Date` on 3 rows. That is *correct* for a pre-alert — a shipment is committed before it flies. Only the `31-Dec-99` sentinel is wrong, and it is caught by the year test, not by a date-ordering rule. A system that warned on commit-before-flight would train the team to dismiss the warning that actually matters.

---

## 4. Open questions this document raised

| # | Question | Blocks | Owner |
|---|---|---|---|
| Q1 | Is `MPS` a pieces count or a sequence? | **Slice 2** — the arrival notice prints `PIECES` | Courier team lead |
| Q2 | Citation: Notification 34/2021 or Circular 08/2021? | Template text, go-live | Compliance |
| Q3 | Was the 06-Jan-2025 DO increase ever applied? Tables still show ₹2,600 | Live fee values | Compliance / Finance |
| Q4 | Kolkata "within 1630 hours" — is that 16:30? | Template 3 | Broker / Kolkata team |
| Q5 | Action deadline: 3-hour window or 16:30 cutoff? | F17 reminder engine | Compliance |
| Q6 | `STAT44` / `STAT53` in the TP-hold broadcast? | F16 | Del Gateway |
| Q7 | Which broker escalation mailbox is current? (9 names in one template, 6 in another, different sets) | Template text, go-live | Clearance leads |
| Q8 | Subjects for the 4 post-IGM mails, which have none in source | Slice 2 | Clearance team |
| Q9 | Is there a non-Delhi variant of the arrival notice? Kolkata clearly differs | Slice 2 | Broker teams |
| Q10 | Who are the **15 `CEP` names that resolve to no profile**? Match them to real people, or confirm they should be dropped | Nothing — it is a warning, and the send is not blocked. But 43 rows ship with a colleague silently not copied | Courier team lead |

**Q1 is the only one that hard-blocks a build phase.** Q10 is worth ten minutes of someone's time in Workshop 1 precisely because nothing breaks without it — which is exactly the kind of question that otherwise gets lost, and the person who has to notice the missing cc is a customer.

---

## 5. What is explicitly *not* ported

| From source | Why |
|---|---|
| `cargo-paf` `.env.local` | **Never read.** Contains production secrets |
| Hardcoded `Password123!` in `scripts/seed.ts` | L8 — cannot enter a FedEx tenant |
| Unauthenticated `/api/inbox/ingest` | Replaced by Entra + authorisation (doc 8 §5) |
| `AZURE_AD_CLIENT_SECRET` with full-mailbox Graph scope | Replaced by least-privilege delegate + send-as (doc 14) |
| `max_attempts: 999`, dormant `vercel.json` cron | Replaced by bounded retry and a real scheduler (C10) |
| Personal staff mailboxes in template text | Replaced by `cd_agentprofile` lookup (C11 pattern) |
| Bank details in template text | Replaced by Finance-owned config (§1.4) |
| `POWER_AUTOMATE_BLUEPRINT.md` hybrid architecture | C13 — Dataverse is the system of record |
| Vercel + Supabase + personal Gmail hosting | L8 |
