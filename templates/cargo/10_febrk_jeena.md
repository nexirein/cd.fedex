# 10 — Delhi FEBRK · Jeena
**Source:** `cargo-paf/Template/FEBRK/Jeena/febrk-Jeena.md` (84 lines)
**Route:** Delhi · cleared by FedEx's nominated broker, **Jeena & Co.**
**Status:** DRAFT · instructional prose rewritten; legal lines verbatim · awaiting sign-off
**✅ Confirmed 2026:** Jeena is still a FedEx nominated Delhi broker.

**Subject**
```
CARGO ARRIVAL NOTICE — Pre Alert, AWB and freight charges | AWB {{AWB}} | {{CONSIGNEE}}
```

<!-- LEGAL — verbatim. B3-1: source cites "Notification No. 34/2021". Do not paraphrase. -->

---

Dear {{SALUTATION}},

Your shipment is expected to arrive at **Delhi** under cargo mode. FedEx's nominated broker, **Jeena & Co.**, will handle its customs clearance.

**View and download your documents:** {{SECURE_LINK}}

You can open this link at any time. It always shows the current position of your shipment and anything we still need from you.

## Your shipment

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Expected arrival | {{EXPECTED_ARRIVAL}} |
| Customs broker | Jeena & Co. |

## Two things that cause most cargo delays

**1. Do not pay duty before the IGM is filed.**

Customs assesses duty against the IGM. If you pay earlier, the payment cannot be applied to the correct assessment and has to be refunded and re-made. This is the single most common cause of a stuck cargo consignment.

**2. Checklist approval must be completed before the office closes at 6:00 pm.**

The duty checklist has to be prepared and approved before we can file. If approval comes after 6:00 pm, it moves to the next working day, and the Bill of Entry files a day late.

## What happens next — three steps

### Step 1 · Checklist preparation and approval

Your broker cannot start work until the checklist is approved. To prepare it we need:

{{DOCUMENT_CHECKLIST}}

**Send these as early as you can.** Every hour the checklist waits is an hour the Bill of Entry cannot be filed in advance of arrival.

### Step 2 · Prior Bill of Entry filing

Filing in advance, before the shipment lands, is what avoids the late-filing penalty. Your broker handles this once the checklist is approved and the IGM is available.

### Step 3 · Customs clearance and release

Customs may raise queries during release. We will pass them to you as they arrive — the fastest way to resolve a query is to reply on the same thread.

## What it will cost

| Particulars | Basis | Amount |
|---|---|---|
| Customs clearance | Fixed | {{CLEARANCE_FEE}} |
| GST | As per applicable rates | As applicable |
| AAI / warehouse | As per actual receipt | As per actual |
| Customs duty | As per actual receipt | As assessed by Customs |
| Duty advancement fee | 2% of invoice, or INR 800 — whichever is higher | As applicable |
| **Duties and taxes are payable by the consignee** | | |

> **⚠️ Two open items on this table.**
> The source read *"Service Tax"* — service tax was subsumed by GST in July 2017, and every other line here says GST. Corrected to GST.
> The **duty advancement basis is disputed**: this route says 2% of *invoice*, while Kolkata says 2% of *duty + EDI*. On a cargo consignment these differ substantially. We have not changed it. See cargo README finding 2 and doc 22 §2.3 — Commercial owns this decision.

## If the Bill of Entry is filed late

<!-- LEGAL — verbatim, unchanged. B3-1 applies to the citation. -->

As per Notification No. 34/2021:

1. INR 5,000 per day for the first 3 days after arrival
2. INR 10,000 per day from the 4th day onwards

**This is why the checklist timing matters.** The penalty is charged per day, and it is charged to the consignee — you.

## What we need from you

<!-- HELD B3-3: source gives "within 3 hours" for documents and 6:00 pm for office close. Both retained. -->

**Action required:** please provide the shipment pre-alert and clearance documents **within 3 hours of this mail** to enable timely filing and avoid penalties. Delays will result in additional charges, for which FedEx or Jeena & Co. cannot be held responsible.

{{DESK_SIGN_OFF}}

---

## Rewrite notes

**Fixed a factual error in the source.** `febrk-Jeena.md:11` read *"cleared by FedEx's nominated broker, SUNIMPEX"* — in the **Jeena** file. Corrected.

**Rewritten** — the two-step "Key reminders" and flat document list became an explanation of *why* each rule exists; the three clearance steps gained what the customer is waiting for at each; the charges became a table with the disputed line flagged.

**Kept verbatim** — penalty amounts, the delay-liability sentence naming Jeena & Co.

| Source | Change |
|---|---|
| **`febrk-Jeena.md:11`** | **Wrong broker — SUNIMPEX → Jeena & Co.** |
| `febrk-Jeena.md:62` | *"Service Tax"* → GST (2017 reform) |
| `febrk-Jeena.md:67` | Duty advancement basis → **flagged, unchanged** |
| `febrk-Jeena.md:1` | `this are the mails that alwasy in cc` + 11 personal `@jeena.co.in` addresses, one duplicated, plus zero-width characters → `{{CC_LIST}}` |
| `febrk-Jeena.md:4` | Editing note inside the subject line → removed |
| `febrk-Jeena.md:75` | Unclosed `**Action Required:` → closed |
| `febrk-Jeena.md:75` | *"Jeena & Co."* | **verbatim — legal** |
| `febrk-Jeena.md:68-74` | Penalty wording | **verbatim — legal** |
| `febrk-Jeena.md:81` | `FedEx Team` | `{{DESK_SIGN_OFF}}` |
