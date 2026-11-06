# 02 — Delhi Prior Intimation
**Source:** `cargo-paf/Template/POST/cargo arrival notice pre alert/mail.md` (62 lines)
**Route:** Delhi · prior BOE, customer-appointed broker
**Status:** DRAFT · rewritten; legal lines verbatim · awaiting sign-off

**Subject**
```
CARGO ARRIVAL NOTICE — Pre Alert | AWB {{AWB}} | {{CONSIGNEE}}
```

<!-- LEGAL — verbatim. B3-1: source cites "Notification no 34/2021". Do not paraphrase. -->

---

Dear {{SALUTATION}},

Your shipment is expected to arrive at **Delhi** under cargo mode. You have appointed your own broker, and we will work with them.

**View and download your documents:** {{SECURE_LINK}}

The link is the same throughout this shipment's clearance. It always shows the current position and anything we still need from you.

## Your shipment

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Expected arrival | {{EXPECTED_ARRIVAL}} |

## What happens if you appoint your own broker

**You remain responsible for the final delivery.** If you or your CHA collects the Delivery Order from FedEx, delivery is your CHA's responsibility from that point. FedEx releases the shipment against the D/O; it does not deliver it.

**The MAWB and IGM arrive after the shipment does.** We generate them once the consignment lands, and send them to your broker. Your broker cannot file a compliant Bill of Entry before then.

**But your broker can file in prior, without the MAWB.** Customs permits this, and it is the single most effective way to avoid a late-filing penalty. Waiting for the MAWB means waiting for the shipment to land first.

## Prefer FedEx's authorized broker?

If you would rather we handle customs clearance, write to **{{BROKER_REQUEST_MAILBOX}}** with this subject line exactly:

```
FedEx Clearance Require for AWB#
```

Our nominated brokers are Jeena & Co. and Sunimpex. Either can take over this shipment.

## Collecting the Delivery Order

**1. Write to** {{DO_MAILBOX}}.

**2. Send the authority letter** in favour of your broker, from the consignee's official email ID. The format is on your shipment page. Without it, the D/O can only be released to the consignee.

**3. Pay by NEFT** — **{{DO_FEE_AMOUNT}}** — using the bank details on your shipment page.

**4. Paste the UTR or IMPS reference** in your mail. A screenshot cannot be matched against our bank statement, and an unmatched payment delays your release.

| | |
|---|---|
| AWB no. | {{AWB}} |
| Consignee GSTIN | {{GSTIN}} |
| UTR no. — NEFT / IMPS | ____________________ |
| Remitter account name | ____________________ |

### Delivery Order charges

**Effective January 6, 2025, DO charge increases apply.**

{{FEE_TABLE}}

**Effective November 22, 2023**, the admin fees applicable on the Delivery Order for inbound shipments changed. If the D/O is not collected on the day of arrival, an additional fee of **INR 1,000 + 18% GST** applies.

> **The source template announced this table and then omitted it entirely** — `pre alert/mail.md:42-44` reads *"DO Fees"* and *"Admin Fee Charges on late DO collection."* and the section ends with no figures, while line 32 separately quoted INR 3,068. Restored from the one intact table in the source set.

## If the Bill of Entry is filed late

<!-- LEGAL — verbatim, unchanged. B3-1 applies to the citation. -->

As per the Notification no. 34/2021 dated 29-03-2021, with immediate effect, the Bill of Entry must be filed by the end of the day of arrival to avoid a fine for late filing.

1. INR 5,000.00 per day from the 1st day of arrival, for 3 days.
2. INR 10,000.00 per day from the 4th day onwards, until the day of filing.

## What we need from you

<!-- HELD B3-3: source gives 3 hours. -->

Please send the pre-alert and clearance documents **within 3 hours of receiving this mail**. That gives your broker time to file in advance rather than after arrival, which is what avoids the penalty above.

If there is any delay in providing the clearance documents, the carrier or clearance broker will not be held responsible for additional charges incurred due to late presentation of the Bill of Entry.

{{DESK_SIGN_OFF}}

---

## Rewrite notes

**Removed a pasted Outlook header.** `mail.md:1-9` contained *"Summarize this email"*, the sender, a date, and **seven recipient addresses in the body** — a customer-facing mail carrying its own recipient list.

**Rewritten** — the broker-responsibility consequences are now stated as consequences rather than as one dense paragraph; MAWB timing and prior filing are separated, since conflating them is what causes a day-late BOE; D/O collection became four numbered steps, each with the reason it is refused.

**Kept verbatim** — penalty amounts and the delay-liability sentence.

| Source | Change |
|---|---|
| `mail.md:1-9` | Pasted Outlook header + 7 recipient addresses in body | removed |
| `mail.md:15` | *"Please find the attached AWB/ CI for filling the documents."* | `{{SECURE_LINK}}` |
| `mail.md:23` | 6 hard-coded `@fedex.com` addresses | `{{BROKER_REQUEST_MAILBOX}}` |
| `mail.md:30` | *"(Attached is the format)"* | shipment page |
| `mail.md:32` | *"(Refer Attachment)"* — bank details | shipment page |
| `mail.md:42-44` | **Fee table missing entirely** | `{{FEE_TABLE}}` restored |
| `mail.md:50-54` | Citation + penalty amounts | **verbatim — legal** |
| `mail.md:58` | Delay-liability sentence | **verbatim — legal** |
| `mail.md:62` | `FedEx Trace Team.` | `{{DESK_SIGN_OFF}}` — A-2 |
| `mail.md:13` | *"Dear Sir/Madam"* | `{{SALUTATION}}` |
