# 03 — Kolkata Charges · FedEx CHA
**Source:** `cargo-paf/Template/POST/cargo arrival mail template.md` §A
**Route:** Kolkata · clearance by FedEx's appointed CHA
**Status:** DRAFT — awaiting sign-off
**Banded:** B3-1 citation, B3-2 penalty days, B3-3 deadline

**Subject**
```
CARGO ARRIVAL NOTICE | AWB {{AWB}}, {{CONSIGNEE}} | {{SERVICE}}
```

<!-- HELD-B3-1: source cites "Notification no 34". Template folder holds Circular-No-08-2021.pdf. -->
<!-- HELD-B3-2: Kolkata source charges penalty from day 2; Delhi source charges from day 1. Left as found. -->
<!-- HELD-B3-3: source contains BOTH 1630 hours and 1430 hrs. Both left as found. -->

---

Dear Sir/Madam,

This shipment will arrive under **cargo mode** and be cleared by FedEx's appointed Customs House Agent.

**{{LINK_BLOCK}}**

{{PIECES_BLOCK}}

The Bill of Entry will be filed in advance by FedEx's broker. Customs may raise queries during release; we will share them with you as they arise.

Please note that **payment of duty before the IGM is generated is not accepted.**

### Estimated charges

| Particulars | Basis | Amount |
|---|---|---|
| Customs clearance | Fixed | {{CLEARANCE_FEE}} |
| Customs duty | As per actual receipt | As assessed by Customs |
| AAI / warehouse | As per actual receipt | As per actual |
| EDI charges | As per notification | As notified |
| Duty advancement fee | {{DUTY_ADVANCE_BASIS}} or INR 800, whichever is higher | As applicable |
| **Duties and taxes are payable by the consignee** | | |

> **⚠️ B3-2 and the duty-advancement basis are open.** This route states the duty advancement fee on **duty + EDI**, whereas the Delhi FEBRK templates state **2% of invoice** — see cargo README finding 2. Both are reproduced here as found. **Do not treat this as final until that discrepancy is resolved**, because the two produce very different numbers.

### Customs duty payment

{{BANK_DETAILS_BLOCK}}

*No cash and no demand draft. Payment by NEFT or RTGS only, against a valid UTR.*

### Late Bill of Entry filing penalty

As per the Notification no. 34/2021:

1. INR 5,000.00 per day from the **2nd day** of arrival, for 3 days.
2. INR 10,000.00 per day from the 5th day onwards, until the day of filing.

### Clearance documents

Please share the following. These are required to prepare the duty checklist.

{{DOCUMENT_CHECKLIST}}

<!-- HELD-B3-3: source says documents are required within 1630 hours here, and within 1430 hrs elsewhere in the same file. -->

{{DESK_SIGN_OFF}}

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| `cargo arrival mail template.md:21` | *"PFA the AWB and invoice in .tiff format."* | `{{LINK_BLOCK}}` |
| `:29` | *"from 5th of January 5,2026"* — the year is written twice | *"Effective January 5, 2026"* |
| `:36` | *"Attached Format"* | portal reference |
| `:46-52` | Fee table flattened to loose words + numbers | real table |
| `:57` | *"within 1630 hours"* | **verbatim** — B3-3 |
| `:68-70` | *"within 1430 hrs"* | **verbatim** — B3-3 |
| Staff roster mid-body | Named broker/clearing staff listed inside the mail body | removed — roster is internal, not customer content |
| `:192` | `"No Cash or DD"` — ambiguous string | "No cash and no demand draft. NEFT or RTGS only." |
| `:~250` | Broken pipe-delimited fee rows | table |
| `:282` | `Thanks & Regards,` — **and nothing after it** | `{{DESK_SIGN_OFF}}` |
| — | `{{PIECES_BLOCK}}` | new — **held.** `MPS` is undefined in the courier sheet, so the piece count cannot be rendered from data yet. See doc 19 §2.4 |
