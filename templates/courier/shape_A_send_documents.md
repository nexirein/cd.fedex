# SHAPE A — Supply documents to FedEx
**Categories:** RBOE (143) · CI Missing (92) · PIMS (32) · Invoice Objection (18) · Content (17) · CBE14 (6) · Port Return (4) · R&R (2) — **314 rows, 95% of courier volume**

> Status: **DRAFT — awaiting sign-off (doc 18, Part A).** Not for sending.
> FedEx files the Bill of Entry once these arrive. The customer is never asked to file one.

**Subject**
```
Action required: {{SHORT_ASK}} | AWB {{AWB}}
```

---

Dear {{SALUTATION}},

We are progressing the clearance of your shipment and need the following before we can continue.

**Shipment details**

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Pieces / weight | {{PIECES}} pcs · {{WEIGHT_KG}} kg |
| Arrived | {{ARRIVAL_DATE}} |

**What we need from you**

{{ASK_BULLETS}}

**Case note:** {{REASON_CLEAN}}

**Why this is needed:** {{RATIONALE}}

Please send the above by **{{RESPONSE_BY}}**. Once we have it, we file the Bill of Entry on your behalf — you do not need to do anything further with customs.

You can reply to this mail with the documents attached, or upload through your FedEx account:
**{{SECURE_LINK}}**

If you have already sent any of these, please disregard this request.

{{DESK_SIGN_OFF}}

---

## Notes for the desk — not part of the mail

- `{{ASK_BULLETS}}` comes from the category config; the shape adds no items of its own.
- `{{RESPONSE_BY}}` is a business-hours deadline, not the statutory BOE deadline. A-5 in doc 18.
- `{{REASON_CLEAN}}` is never shown if empty. Do not send a mail with an empty case note.
- **Do not send if `{{ASK_BULLETS}}` is empty** — that means the category config is missing. Escalate to the config owner.
- The line *"you do not need to do anything further with customs"* is deliberate. Courier customers have no customs relationship with FedEx and routinely assume they do. Removing that line was a direct consequence of correcting the licence error.
- **Port Return** uses this shape. Its `{{ASK_BULLETS}}` is a return decision plus a collection request, not a document list.
- **R&R** uses this shape. Its `Reason` is `RETPP, EXPORT DOX REQD` — a document request, so it belongs in A, not B.
- `{{PIECES}}` here is **courier** pieces from ACCS. It is unrelated to the cargo `MPS` field — see the blocked-field note in doc 18.

## RBOE — the specific case

143 rows, and 118 of them have a bare `RBOE` with no detail. Two paths:

| `Reason` | What happens |
|---|---|
| Detailed (25 rows) | Mail renders with the specific ask from the config |
| Bare `RBOE` (118 rows) | Mail renders with the standard FedEx-format requirement list, and the case goes to **agent enrichment** first |

**Do not auto-send the bare 118.** The template states what is needed; the agent confirms from ACCS that it is correct for that shipment. A wrong document list costs a day of clearance, which is worse than a ten-minute agent look.
