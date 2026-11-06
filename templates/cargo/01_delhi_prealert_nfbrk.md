# 01 — Delhi Pre-Alert (NFBRK)
**Source:** `cargo-paf/Template/NFBRK/nfbrk.md` (96 lines)
**Route:** Delhi · customer-appointed broker · prior BOE
**Status:** DRAFT — instructional prose rewritten; legal lines verbatim · awaiting sign-off

**Subject**
```
CARGO ARRIVAL NOTICE — Pre Alert | AWB {{AWB}} | {{CONSIGNEE}}
```

<!-- LEGAL — verbatim, unchanged. B3-1: source cites "Notification no 34/2021" while Template/NFBRK/ holds Circular-No-08-2021.pdf. Do not paraphrase. -->

---

Dear {{SALUTATION}},

Your shipment is expected to arrive at **Delhi** under cargo mode. This message tells you what to do now, before it lands, so nothing is delayed on arrival.

## Your shipment

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Expected arrival | {{EXPECTED_ARRIVAL}} |

**View and download your documents:** {{SECURE_LINK}}

You can open this link at any time — before arrival, after arrival, or whenever you need something. It always shows the current position of your shipment.

## Who is clearing this shipment

You have appointed your own broker, and we will work with them.

If you would rather use FedEx's authorized broker, reply to this mail or write to **{{BROKER_REQUEST_MAILBOX}}** with this subject line exactly:

```
FedEx Clearance Require for AWB#
```

We will then take over the customs clearance for this shipment.

## What to do before arrival

**1. Send us your clearance documents**

The sooner we have these, the sooner your broker can file. Waiting until the shipment lands costs you time and can attract a penalty.

{{DOCUMENT_CHECKLIST}}

**2. Decide on the Bill of Entry**

Your broker can file the Bill of Entry **in advance, before the MAWB is available**. Customs allows this specifically to avoid late-filing penalties. Waiting for the MAWB usually means waiting for the shipment to land first.

**3. Know what happens on arrival**

| Event | What happens |
|---|---|
| Shipment arrives | MAWB and IGM are generated |
| Duty assessed | Your broker files the Bill of Entry |
| Duty payment | **Only after the IGM is filed** — see below |
| Delivery Order | Released once payment and documents are in place |

**Do not pay duty before the IGM is filed.** Customs assesses duty against the IGM. Payment made earlier cannot be applied correctly and will have to be refunded and re-made.

## If you want FedEx's Delivery Order (D/O)

To release the D/O, write to **{{DO_MAILBOX}}** with:

- **Authorization letter** in favour of your broker, from the consignee's official email ID. The format is on your shipment page.
- **Payment** of **{{DO_FEE_AMOUNT}}** by NEFT, using the bank details on your shipment page.
- **Clear payment details** — paste the UTR or IMPS reference in your mail. A screenshot is not enough to match against our statement.

| | |
|---|---|
| AWB no. | {{AWB}} |
| Consignee GSTIN | {{GSTIN}} |
| UTR no. — NEFT / IMPS | ____________________ |
| Remitter account name | ____________________ |

### Delivery Order charges

Effective **January 6, 2025** the D/O charges below apply. Effective **November 22, 2023**, an admin fee applies to the D/O if it is not collected on the day of arrival.

{{FEE_TABLE}}

**Collecting the D/O:** if you or your CHA collects the D/O from FedEx, you are responsible for the final delivery of the shipment.

## What we need from you, and by when

<!-- HELD B3-3: source gives "within 3 hours of this mail". Other routes give 16:30 / 14:30 / 18:00. -->

Please send the documents above **within 3 hours of receiving this mail**. That gives your broker time to file in advance rather than after arrival.

**Why this matters.** Customs requires the Bill of Entry to be filed by the end of the day of arrival to avoid a late-filing penalty:

<!-- LEGAL — verbatim, unchanged. B3-1 applies to the citation. -->
1. INR 5,000.00 per day from the 1st day of arrival, for 3 days.
2. INR 10,000.00 per day from the 4th day onwards, until the day of filing.

If there is any delay in providing the clearance documents, the carrier or clearance broker will not be held responsible for additional charges incurred due to late presentation of the Bill of Entry.

{{DESK_SIGN_OFF}}

---

## Rewrite notes

**Rewritten** — instructional prose, previously the source's own wording: the "what to do before arrival" section is new and replaces the source's flat document list; the arrival sequence table is new; the D/O collection steps are rewritten around what the customer must do rather than what FedEx must receive; the "do not pay before IGM" rule is promoted to its own section because it is the most common cargo error.

**Kept verbatim** — the penalty amounts, the delay-liability sentence, the DO tariff dates.

**Removed** — `.tiff` instructions (line 5), 6 "Attached / Refer Attachment" references, 9 hard-coded `@fedex.com` addresses, the flattened fee table, and the incomplete sign-off.

| Source | Change |
|---|---|
| `nfbrk.md:5` | *"Please find the attached AWB/CI in '.tiff' format (Open with Windows Photo Viewer)"* → `{{SECURE_LINK}}` |
| `nfbrk.md:11` | 9 personal addresses → `{{BROKER_REQUEST_MAILBOX}}` |
| `nfbrk.md:20,22,30,32` | *"Attached in the format"* · *"Refer Attachment"* · *"Attached is the format"* · bank details by attachment → shipment page |
| `nfbrk.md:38` | `"No Cash or DD"` → explicit NEFT/UTR guidance |
| `nfbrk.md:57-87` | Flattened fee table → `{{FEE_TABLE}}` |
| `nfbrk.md:42,52-54,58` | Penalty wording | **verbatim — legal** |
| `nfbrk.md:40,46` | DO tariff dates | **verbatim** |
| `nfbrk.md:55` | *"Dear Sir/Madam"* | "Dear {{SALUTATION}}" |
| `nfbrk.md:8,11,21,55` | Zero-width characters in the source | removed |
