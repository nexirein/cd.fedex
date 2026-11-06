# Clearance Desk — Template & Configuration Guide

*Every mail template, every category checklist, every fee rule, every cutoff. This is what you fill in during weeks 1–2 and refine during the pilot.*

> **Before writing anything, read doc 17 — the Source Fidelity Contract.** It holds the verbatim text of the live customer mails, the exact fee arithmetic, the document-request lists, the penalty wording and the branded-PDF geometry. This guide tells you how to *store* a template; doc 17 tells you what the template must *say*. A template written from this guide alone will be structurally valid and factually wrong, which is the worst combination available.

---

## 1. Mail templates

### 1.1 Naming convention

`{team}_{case_type}_{variant}`

Examples: `cargo_ubond_febrk`, `courier_missing_ci`, `igm_do_payment_request`, `igm_balance_due`

### 1.2 Placeholder syntax

Templates use `{field_name}` placeholders filled from the case record:

| Placeholder | Source |
|---|---|
| `{awb}` | case.awb_ubond |
| `{company_name}` | company.name |
| `{agent_name}` | batch.agent.full_name |
| `{case_ref}` | case.case_ref |
| `{pieces}` | case.pieces |
| `{weight_kg}` | case.weight_kg |
| `{declared_value}` | case.declared_value |
| `{currency}` | case.currency |
| `{origin}` | case.origin |
| `{destination}` | case.destination |
| `{contents}` | case.contents |
| `{mawb}` | case.mawb |
| `{igm_no}` | case.igm_no |
| `{flight_no}` | case.flight_no |
| `{flight_date}` | case.flight_date (formatted) |
| `{arrival_date}` | case.arrival_date (formatted) |
| `{fee_today}` | computed from Fee rule for today |
| `{fee_tomorrow}` | computed from Fee rule for tomorrow |
| `{doc_cutoff}` | gateway.doc_cutoff_workday or _holiday (checked against Holiday table) |
| `{missing_items}` | list of required items where status = missing |
| `{unified_link}` | portal_base_url + "/s/" + case.unified_link_token |
| `{broker_type_display}` | "FedEx CHA (Sunimpex)" / "FedEx CHA (Jeena)" / "Your own CHA" |

### 1.3 Template catalogue (draft — refine with each team)

**Subject format for all templates:**
`AWB {awb} | {title} | {company_name} | [{case_ref}]`

---

#### Cargo templates

**cargo_ubond_febrk** — Pre-alert for known FEBRK customer
```
Dear Sir/Madam,

Your shipment AWB {awb} ({pieces} pcs, {weight_kg} kg, {currency} {declared_value}) 
is arriving at {destination} on {arrival_date}.

Clearance: {broker_type_display}.

Documents needed before {doc_cutoff} on the day of arrival:
{missing_items}

View your shipment, download your invoice and upload documents:
{unified_link}

DO charges: Rs {fee_today} today / Rs {fee_tomorrow} from the next working day.

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

**cargo_ubond_nfbrk** — Pre-alert for known NFBRK customer
```
(Same as FEBRK but with: "Clearance: Your own CHA ({cha_name}).")
```

**cargo_ubond_new** — Pre-alert for new/unmatched customer
```
Dear Sir/Madam,

Your shipment AWB {awb} ({pieces} pcs, {weight_kg} kg) is arriving at {destination} 
on {arrival_date}.

To proceed with clearance, please confirm:
• Will you use your own Customs House Agent, or should FedEx appoint one?
• Your contact details for this shipment

Please confirm here: {unified_link}

If we don't hear from you, we'll follow up before the arrival date.

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

**cargo_postarrival** — Post-arrival notice (after IGM merge)
```
Dear Sir/Madam,

Your shipment AWB {awb} has arrived at {destination}.

MAWB: {mawb} · IGM: {igm_no} · Flight: {flight_no} · {flight_date}

{missing_items_if_any}

DO charges today: Rs {fee_today}. From tomorrow: Rs {fee_tomorrow}.

View details and submit payment: {unified_link}

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

---

#### Courier templates (one per defect category — to be written with the team from their best past mails)

**courier_missing_ci**
```
Dear Sir/Madam,

For your shipment AWB {awb} ({pieces} pcs, {weight_kg} kg, {origin}), 
the commercial invoice has not been received. Customs requires this before 
the Bill of Entry can be filed.

Please provide:
• Commercial invoice with item-wise description, net and gross weight, 
  declared value in {currency}
• Packing list

Upload here: {unified_link}

Documents are needed by {doc_cutoff} to enable timely clearance.

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

**courier_value_clarification**
```
Dear Sir/Madam,

For your shipment AWB {awb}, the invoice value is {currency} {extracted_invoice_value} 
while the airway bill shows {currency} {declared_value}.

Customs needs this corrected before clearance can proceed.

Please provide:
• The correct value and currency
• The reason for the difference
• A corrected invoice

Submit here: {unified_link}

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

**courier_content_desci**
```
Dear Sir/Madam,

For your shipment AWB {awb}, the item description "{contents}" is insufficient 
for Customs classification.

Please provide:
• The exact product name
• Its function and end use
• The material it is made of
• The applicable HS code (if known)

A technical write-up, product datasheet or catalogue may also be submitted.

Upload here: {unified_link}

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

*(Similar templates for: Duty/ROD, Invoice objection, RBOE, MOC, SVB, DGCA, CBE-XIV, PIMS, Port return — each listing exactly the items from the Item rule table for that category.)*

---

#### IGM templates

**igm_do_payment_request**
```
Dear Sir/Madam,

Your shipment AWB {awb} (MAWB: {mawb}, IGM: {igm_no}) is ready for 
Delivery Order processing.

DO charges today: Rs {fee_today}.
From the next working day: Rs {fee_tomorrow}.

Bank details for NEFT:
Bank of America · A/C: XXXXXXXXXXXX · IFSC: BOFAXXXXXXX

Submit your payment reference and authority letter:
{unified_link}

Regards,
IGM Team, FedEx {destination}
```

**igm_payment_received**
```
Dear Sir/Madam,

Payment of Rs {amount_submitted} for AWB {awb} has been received and confirmed.
Your Delivery Order is being processed.

Track your shipment: {unified_link}

Regards,
IGM Team, FedEx {destination}
```

**igm_balance_due**
```
Dear Sir/Madam,

We received Rs {amount_submitted} for AWB {awb}. 
The total due is Rs {amount_due}. A balance of Rs {balance} is outstanding.

Please transfer the balance and share the UTR:
{unified_link}

Regards,
IGM Team, FedEx {destination}
```

**igm_utr_not_found**
```
Dear Sir/Madam,

We could not verify UTR {utr} for AWB {awb} against our bank records.

Please check the UTR and share a copy of the bank transfer advice:
{unified_link}

If you believe this is an error, please reply to this email.

Regards,
IGM Team, FedEx {destination}
```

---

#### Reminder templates

**reminder_1** (gentle, T + 4h)
```
Dear Sir/Madam,

This is a reminder regarding AWB {awb}.

Still needed:
{missing_items}

Submit here: {unified_link}

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

**reminder_2** (deadline, T + 8h or 2h before cutoff)
```
Dear Sir/Madam,

Documents for AWB {awb} are due by {doc_cutoff} today.

Still needed:
{missing_items}

Late submission may result in delayed clearance and additional charges 
(Rs {fee_tomorrow} from the next working day).

Submit now: {unified_link}

Regards,
{agent_name}
FedEx Trace Team, {destination}
```

---

## 2. Required items per case type and category

### 2.1 Cargo pre-alert

| # | Item | Type | Mandatory |
|---|---|---|---|
| 1 | Broker / CHA confirmation | confirmation | Yes |
| 2 | KYC (company registration) | document | Yes |
| 3 | Authority letter | document | Yes |
| 4 | GATT / import declaration ×2 | document | Yes |
| 5 | Commercial invoice & packing list | document | Yes |
| 6 | Technical write-up | document | Depends on HS code |
| 7 | Bank AD code | field | Yes |
| 8 | IEC certificate | document | Yes |
| 9 | GST certificate | document | Yes |
| 10 | E-way bill | document | Yes (if applicable) |
| 11 | EPR / LMPC registration | document | If applicable |
| 12 | Contact details (name, email, phone) | field | Yes (new customers only) |

### 2.2 Courier exception categories

| Category | Items | Types |
|---|---|---|
| **Missing CI** | Commercial invoice, Packing list | document, document |
| **Invoice objection** | Which field wrong (field), Corrected invoice (document) | field, document |
| **Content / DESCI** | Product name + function (field), HS code (field), Write-up / catalogue (document) | field, field, document |
| **Duty / ROD** | Accept duty yes/no (confirmation), Reason if no (field), Payment contact (field) | confirmation, field, field |
| **Value clarification** | Correct value + currency (field), Reason (field), Corrected invoice (document) | field, field, document |
| **RBOE (HV)** | Checklist approval (confirmation), KYC (document), Authority letter (document), IEC (document), GST (document), AD code (field) | confirmation, document ×4, field |
| **MOC** | FedEx or own CHA (confirmation), CHA details if own (field) | confirmation, field |
| **SVB** | Related party yes/no (confirmation), SVB order no. (field), SVB order (document) | confirmation, field, document |
| **DGCA** | Certificate/approval no. (field), Certificate (document) | field, document |
| **CBE-XIV** | Registration no. (field), Validity (field), Certificate (document) | field, field, document |
| **PIMS** | Registration no. (field), Certificate (document) | field, document |
| **Port return** | Return/re-export/abandon (confirmation), Address if return (field) | confirmation, field |

### 2.3 IGM DO payment

| # | Item | Type | Mandatory |
|---|---|---|---|
| 1 | UTR number | field | Yes |
| 2 | Amount paid | field | Yes |
| 3 | Remitter account name | field | Yes |
| 4 | Consignee GSTIN | field | Yes |
| 5 | Payment date | field | Yes |
| 6 | Collection by (FedEx / own CHA) | confirmation | Yes |
| 7 | Authority letter | document | Yes |
| 8 | DO request letter | document | Yes |
| 9 | Payment matched against bank | internal | Yes (system) |
| 10 | DO processed in ACCS | internal | Yes (IGM agent) |

---

## 3. Fee rules (Delhi)

| Tier | DO charge | Admin fee | GST (18%) | Total |
|---|---|---|---|---|
| Arrival day | Rs 2,600 | Rs 0 | Rs 468 | **Rs 3,068** |
| Next working day onward | Rs 2,600 | Rs 1,000 | Rs 648 | **Rs 4,248** |

**No DO on:** second Saturdays and customs holidays (from the Holiday table).

**Fee change timing:** midnight local time. The reminder sweeper (F17) updates the fee tier on open cases and sends a fee-change notification if the customer hasn't paid.

**Confirm with Compliance:** is there a different rate for HV shipments or specific categories? Store any variation as a separate fee rule row.

---

## 4. Cutoff times (Delhi)

| Cutoff | Working days | Customs holidays |
|---|---|---|
| Document submission | 16:30 | 14:30 |
| DO processing window | 09:30 – 17:30 | 09:30 – 14:30 |

**Reminder timing is computed from cutoff:**
- Reminder 1: cutoff minus 6 hours (or T + 4h, whichever is later)
- Reminder 2: cutoff minus 2 hours
- Escalation: 24h after first send, or 30 min after cutoff if no response

---

## 5. Holiday list (Delhi, 2026–2027)

*To be filled by Compliance in Workshop 4. Include: gazetted holidays, customs holidays, second Saturdays.*

| Date | Type | Description |
|---|---|---|
| ... | ... | ... |

This table is edited by the supervisor in the Settings screen. The reminder sweeper (F17) checks it before every reminder.

---

## 6. Routing rules

| Case type | Category | Value class | Owner team |
|---|---|---|---|
| cargo_ubond | — | — | Cargo |
| cargo_postarrival | — | — | Cargo |
| courier | Missing CI / Invoice obj. / DESCI / Value / MOC / SVB / DGCA / CBE / PIMS / Port return | LV/MV | Courier-SD or Courier-CD |
| courier | Duty / ROD | LV/MV | Courier-SD or Courier-CD |
| courier | RBOE | HV | Courier-RBOE |
| igm | — | — | IGM |
| cha | — | — | (routed to the case's team) |
| triage | — | — | Duty person |

*Split logic — **settled, do not re-open (D4).** The pull sheet arrives carrying the division's own `Team` and `Agent` columns, and the app consumes them as given. There is no round-robin and no auto-assign, because inventing a distribution the team does not use would be worse than doing nothing. Only the 65 `BOM` / `BOM CEP` pool rows need a human decision (F28); the `CEP` column becomes `Share` rows, never owners.*

---

## 7. Autonomy rules (initial settings)

| Situation | Starting level | Notes |
|---|---|---|
| Out-of-office reply | 0 (auto, no mail) | Always |
| Bounce / undeliverable | 0 (auto, no mail) | Marks contact invalid |
| "Thank you" reply | 0 (auto, no mail) | Logged, no action |
| Portal upload that satisfies all items | 0 (auto, no mail) | Items ticked; case → complete |
| "Documents received — thank you" | 2 (draft) → promote to 1 after 95% | Candidate for early Level 1 |
| "Still missing: {items}" reminder | 2 (draft) → promote to 1 after 95% | Candidate for early Level 1 |
| "Payment received — DO in process" | 2 (draft) → promote to 1 after 95% | Candidate for early Level 1 |
| Reply with question | 2 (draft + human approval) | Always Level 2 at minimum |
| Reply with partial documents | 2 (draft + human approval) | — |
| Reply with all documents | 2 (draft + human approval) | — |
| Dispute / complaint | 3 (human only) | Always |
| Low confidence (< 0.7) | 3 (human only) | Always |
| Risk flag present | 3 (human only) | Always |
| No AWB found | 3 (human only) | Always |
