# SHAPE B — Confirm a figure
**Categories:** Duty (13) · Value Clarification (3) · MOC (2) — **18 rows**

> Status: **DRAFT — awaiting sign-off (doc 18, Part A).** Not for sending.
> 18 rows only, but these are the mails where a wrong number causes a dispute.

**Subject**
```
Confirmation required: {{SHORT_ASK}} | AWB {{AWB}}
```

---

Dear {{SALUTATION}},

Duty has been assessed on your shipment and we need your confirmation before we proceed.

**Shipment details**

| | |
|---|---|
| AWB | {{AWB}} |
| Consignee | {{CONSIGNEE}} |
| Route | {{ORIGIN}} → {{DESTINATION}} |
| Pieces / weight | {{PIECES}} pcs · {{WEIGHT_KG}} kg |
| Arrived | {{ARRIVAL_DATE}} |

**The figure requiring your confirmation**

| | |
|---|---|
| {{FIGURE_LABEL}} | **{{FIGURE_AMOUNT}}** |
| {{FIGURE_BASIS}} | {{FIGURE_DETAIL}} |

**Case note:** {{REASON_CLEAN}}

**Why this matters:** {{RATIONALE}}

Please confirm the above by **{{RESPONSE_BY}}** by replying to this mail or through your FedEx account:
**{{SECURE_LINK}}**

{{DESK_SIGN_OFF}}

---

## Notes for the desk — not part of the mail

- **This is the only shape that carries a currency figure.** The renderer must fail loudly if `{{FIGURE_AMOUNT}}` is empty — never send a figure-less version of this mail.
- `{{FIGURE_LABEL}}` is category-driven: *Duty assessed* / *Declared value* / *Consignee details to be amended*.
- For **Duty**, the assessed amount and the rate breakdown are copied from the case record **exactly**. This number is what the customer will be billed, so it is never re-derived in the mail renderer.
- For **Value Clarification**, show both declared and proposed value where both exist. Never imply the customer is under-declaring.
- For **MOC**, this is a consent request, not an invoice query. Tone differs and the config supplies it.
- A-2: the sign-off is the desk name, never an individual. If the customer asks who to contact, the desk name is the contact.
- No request to file anything. FedEx files the Bill of Entry on receipt of the confirmation.
