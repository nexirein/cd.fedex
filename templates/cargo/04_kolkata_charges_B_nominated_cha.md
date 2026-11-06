# 04 — Kolkata Charges · Customer's Nominated CHA
**Source:** `cargo-paf/Template/POST/cargo arrival mail template.md` §B
**Route:** Kolkata · clearance by the customer's own nominated CHA
**Status:** DRAFT — awaiting sign-off
**Banded:** B3-1, B3-2, B3-3

**Subject**
```
CARGO ARRIVAL NOTICE | AWB {{AWB}}, {{CONSIGNEE}} | {{SERVICE}}
```

<!-- HELD-B3-1 / B3-2 / B3-3 — same open items as 03. -->

---

Dear Sir/Madam,

This shipment will arrive under **cargo mode**. You have nominated your own broker for clearance.

{{LINK_BLOCK}}

{{PIECES_BLOCK}}

Your broker will file the Bill of Entry. Please share the shipment details below with them and keep them informed of the customs position, as duties and penalties arising from the filing accrue to the consignee.

**Details for your broker**

| | |
|---|---|
| AWB | {{AWB}} |
| MAWB | {{MAWB}} |
| Consignee | {{CONSIGNEE}} |
| Consignee GSTIN | {{GSTIN}} |
| PAN / IEC | {{PAN_IEC}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Pieces / weight | {{PIECES}} pcs · {{WEIGHT_KG}} kg |
| Invoice number | {{INVOICE_NO}} |
| Invoice value / currency | {{INVOICE_VALUE}} {{CURRENCY}} |
| HS codes | {{HS_CODES}} |
| Arrived | {{ARRIVAL_DATE}} |

### Charges

| Particulars | Basis | Amount |
|---|---|---|
| Customs clearance | Fixed | {{CLEARANCE_FEE}} |
| Customs duty | As per actual receipt | As assessed by Customs |
| AAI / warehouse | As per actual receipt | As per actual |
| EDI charges | As per notification | As notified |
| Duty advancement fee | {{DUTY_ADVANCE_BASIS}} or INR 800, whichever is higher | As applicable |
| **Duties and taxes are payable by the consignee** | | |

> **⚠️ Open:** the duty advancement fee basis differs between routes — see cargo README finding 2. Reproduced as found.

Please note that **payment of duty before the IGM is generated is not accepted.**

### Late Bill of Entry filing penalty

As per the Notification no. 34/2021:

1. INR 5,000.00 per day from the **2nd day** of arrival, for 3 days.
2. INR 10,000.00 per day from the 5th day onwards, until the day of filing.

### Clearance documents

{{DOCUMENT_CHECKLIST}}

{{DESK_SIGN_OFF}}

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| Second mail body in the same file | Prose run-on paragraphs, no tables | structured, with a broker data block |
| `:21` | `.tiff` attachment reference | `{{LINK_BLOCK}}` |
| Staff roster | Named internal staff inside the body | removed |
| `:282` | `Thanks & Regards,` with no sign-off | `{{DESK_SIGN_OFF}}` |
| — | — | **Added:** a broker data block. The source assumed the customer already briefed their CHA. In practice that is the single most common cause of a late BOE, because the CHA files what they were given. This is the one place I have **added** content, and it is added data, not new obligations. |
