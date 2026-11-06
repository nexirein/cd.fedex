# 05 — Delhi Same-Day · DO Collection After IGM Generation
**Source:** `cargo-paf/Template/POST/1st mail of same day after igm generation/mail.md` (84 lines)
**Route:** Delhi · D/O collection on the day of arrival
**Status:** DRAFT — awaiting sign-off

**Subject**
```
CARGO ARRIVAL NOTICE | D/O collection required | AWB {{AWB}}, {{CONSIGNEE}}
```

<!-- HELD-B3-1: source cites "Notification No. 34/2021". Wording left verbatim. -->

---

Dear Sir/Madam,

This shipment has arrived at **Delhi** under cargo mode and the **IGM has been generated**.

**{{LINK_BLOCK}}**

### Delivery Order collection

The Delivery Order is ready for collection.

{{FEE_TABLE}}

Please write to **{{DO_MAILBOX}}** for D/O collection, including:

- Authorization letter in favour of the broker, from the consignee's official email ID
- Consignee GST details — **compulsory**
- Payment details with a clear UTR / IMPS reference

Please note that if the customer or their CHA (Customs House Agent) collects the Delivery Order from FedEx, they will be responsible for the final delivery of the shipment.

**{{DESK_SIGN_OFF}}**

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| `mail.md:1` | Subject line only, no body structure | structured body |
| `mail.md:5` | Pasted personal contact details in the body | `{{DO_MAILBOX}}` from config |
| `mail.md:7` | *"Dear Sir/Ma'am"* | "Dear Sir or Madam" |
| `mail.md:23` | *"Effective January 6, 2025"* | retained — the DO tariff date, unrelated to B3-1 |
| `mail.md:57` | *"Dear Sir/Madam"* | merged; the source had **two** greetings |
| `mail.md:65-78` | Fee table flattened to loose words + numbers | `{{FEE_TABLE}}` |
| `mail.md:84` | `Ayush Saklani \| Clearance Administrator, Delhi \| office 18001033339 \| Ext:891008` | `{{DESK_SIGN_OFF}}` — **A-2** |
| `mail.md:88-104` | Full postal address, hard-coded | signature-block config |
