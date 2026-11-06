# 40 — Excel import map (UBOND / CONSOL)

Status: **confirmed against your real workbook, 23 Oct 2026.**
Supersedes the guesswork in 39 §8.3. This is the contract the Upload screen implements.

---

## 1. The one rule that overrides everything

> **The recipient address is found by shape, never by column position.**

Your workbook puts the consignee email in **`Standard Remarks`**. `ConsigneeEmailID` holds a
phone number. `Contact` holds either. A column named "email" is not evidence of an email.

Resolution order (first hit wins, and the winner is recorded on the row):

| # | Column | Why it is tried here |
|---|--------|----------------------|
| 1 | `Standard Remarks` | **confirmed** location of the address in your rows |
| 2 | `Contact` | sometimes carries an address |
| 3 | `ConsigneeEmailID` | only if it actually contains `@` and a dotted domain |
| 4 | — | none matched → `BLOCKED`, reason `NO_EMAIL` |

A candidate is accepted only if it contains `@`, has at least one character before the `@`,
and has a `.` after the `@`. The whole cell is not required to be only the address — the
address is carved out of surrounding remarks text (e.g. `"pls share docs to ops@acme.example"`).

The row stores **which column won** (`EmailSource`). The pre-flight shows it, because
"email found" is not the same as "email found in the right place".

---

## 2. Column map — 25 real columns → `CD_Shipment`

`CD_Shipment` already has 23 of 45 spec columns. Names below are the **existing or
reconcile-script** names, so the importer writes only to columns that will exist.

| # | Excel column | Target | Transform |
|---|--------------|--------|-----------|
| 1 | `Loc` | `Location` | trim, upper |
| 2 | `Date` | *batch only* | batch date key, not a shipment field |
| 3 | `AWB Numbers` | `AWB` | strip spaces, apostrophe, `.0`; must be 11–12 digits |
| 4 | `Consignee Name` | `ConsigneeName` | trim |
| 5 | `Freight` | *RawJSON* | no target column |
| 6 | `Currency` | `Currency` | trim, upper (3 letters) |
| 7 | `End Result` | `ClearanceType` | via §3 |
| 8 | `Mode` | *RawJSON* | air / sea; informs `Pipeline` when it is ambiguous |
| 9 | `PIN Code` | *RawJSON* | |
| 10 | `Standard Remarks` | `ContactEmail` | §1 shape extraction |
| 11 | `FedEx Broker` | `Broker` | §4; `0`/blank → unresolved |
| 12 | `Contact` | *RawJSON* | phone in your rows |
| 13 | `ConsigneeEmailID` | *RawJSON* | **phone in your rows — never an address** |
| 14 | `Duty Bill Account` | *RawJSON* | |
| 15 | `Value` | *RawJSON* | |
| 16 | `PieceQty` | *RawJSON* | |
| 17 | `KiloWgt` | *RawJSON* | |
| 18 | `IEC` | *RawJSON* | |
| 19 | `InstructionCD` | `InstructionCD` | trim |
| 20 | `Commit date` | *RawJSON* | |
| 21 | `Account` | *RawJSON* | broker evidence for §4 |
| 22 | `SQL Account Customer Name` | `Company` | **preferred** over `Consignee Name` |
| 23 | `Primary CEP` | `PrimaryCEP` | trim |
| 24 | `Secondary CEP` | *RawJSON* | |
| 25 | *(leading timestamp, e.g. `10:22 AM`)* | *discarded* | the header row is dirty — see §5 |

`Company` = `SQL Account Customer Name`, falling back to `Consignee Name`. The customer sees
the company in the pre-alert and on the link, so the accounting name wins.

---

## 3. `End Result` → `ClearanceType`

`ClearanceType` is a Choice column whose allowed values already match the three-way gate:
`NFBRK · FEBRK-JEENA · FEBRK-SUNIMPEX · CALLING · HOLD · UNRESOLVED`.

| End Result (normalised, upper, trimmed) | ClearanceType | Outcome |
|---|---|---|
| `NFBRK` | `NFBRK` | PASS path |
| `FEBRK-JEENA` | `FEBRK-JEENA` | PASS path |
| `FEBRK-SUNIMPEX` | `FEBRK-SUNIMPEX` | PASS path |
| `FEBRK` (bare) | `UNRESOLVED` | **SKIPPED** — broker unnamed |
| `HOLD` | `HOLD` | SKIPPED |
| `CALLING` / `CALLING*` | `CALLING` | SKIPPED |
| anything else | `UNRESOLVED` | **BLOCKED** — unrecognised result |

The sendable set is a **setting** (`CD_Setting.sendableEndResults`), default
`NFBRK;FEBRK-JEENA;FEBRK-SUNIMPEX`. No value is hardcoded in the importer.

A bare `FEBRK` is *not* an error. It is a real, common result that a person must resolve.
SKIPPED never counts as blocked.

---

## 4. Broker resolution — never guess

`Broker` is a Choice: `JEENA · SUNIMPEX · OWN`. In your rows `FedEx Broker` is empty or `0`
in every row.

- Literal text match on `JEENA` / `SUNIMPEX` wins if present.
- Otherwise, for a bare `FEBRK`, the row stays `UNRESOLVED` / `SKIPPED`.
- `Account`, `SQL Account Customer Name` and `InstructionCD` are **evidence shown to the
  person**, never an automatic pick. `InstructionCD` in one row reads
  `"ALL SHIPMENT SELF CLEARANCE IN SEZ JAIPUR"`, which is an argument for `OWN` — but a
  human makes that call once per customer, not per row.
- Fix is a single action on the row: name the broker, which then applies to every row of
  that customer in the batch.

---

## 5. Header matching

- Trim, collapse inner whitespace, compare **case-insensitively**.
- Aliases: `AWB Numbers` / `AWB No` / `AWB`; `End Result` / `EndResult`;
  `Consignee Name` / `Consignee`; `SQL Account Customer Name` / `Account Name`.
- A leading cell containing a **time** is not a header — skip until the first cell that
  matches a known column.
- **Required headers** (hard refusal — nothing imported, and the screen says which are
  missing): `AWB Numbers`, `End Result`, `Standard Remarks`, `Consignee Name`.
- Unknown extra columns are kept in `RawJSON` and shown in the rejected/extra panel; they do
  not block the import.

---

## 6. Per-row verdict (what the Upload screen shows side by side)

| Verdict | Condition | Counted as |
|---|---|---|
| `ACCEPTED` | required fields present, AWB valid, outcome PASS or SKIPPED | accepted |
| `REJECTED` | missing AWB, AWB not 11–12 digits, missing End Result, unrecognised End Result | rejected |
| `BLOCKED` | PASS path but no email resolvable, or bare `FEBRK` with no broker | accepted, flagged |

Rejected rows are **never** silently dropped: they are listed with the exact reason and the
line number from the paste, so the same sheet can be fixed and re-pasted.

Duplicate AWBs inside one paste are rejected on the second occurrence and name the line of
the first (`DUPLICATE_AWB_LINE_7`).

---

## 7. What this unblocks

The reconcile script adds the typed columns this map writes to. Until it has run, a real row
cannot be stored: `RawJSON` is single-line text capped at 255 characters and a real row is
longer. That is why the Upload screen is honest about not being wired yet, rather than
accepting a file and losing it.
