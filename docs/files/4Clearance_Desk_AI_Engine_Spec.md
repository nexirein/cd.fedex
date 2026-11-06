# Clearance Desk — AI Engine Specification

*How the classifier, the drafter and the learning loop work. What the AI does, what it never does, and how it earns more autonomy over time.*

---

## 1. Pipeline

Every inbound mail (to any team mailbox or deldo@) and every portal submission goes through the same pipeline:

```
INPUT
  │
  1. PRE-FILTER (rules, no AI)
  │   out-of-office / auto-reply → log, stop
  │   bounce / undeliverable → mark contact invalid, alert agent, stop
  │   internal FedEx sender → route as internal note, stop
  │
  2. MATCH (rules, no AI)
  │   conversation ID → case
  │   case ref [CG-000118] in subject → case
  │   12-digit AWB in subject/body → open case(s) for that AWB
  │   sender email → company → company's open case (flagged "check")
  │   nothing → Triage queue
  │
  3. READ (AI)
  │   attachments → Azure AI Document Intelligence: file type + key fields
  │   body text → Azure OpenAI: extract values (UTR, amounts, HS codes, names)
  │
  4. CLASSIFY (AI, structured JSON output)
  │   intent, secondary intent, items satisfied, values extracted,
  │   question (if any), sentiment, risk flags, confidence
  │
  5. RETRIEVE (RAG)
  │   Azure AI Search: retrieve the SOP for this case type,
  │   the template for this situation,
  │   top 3 approved past replies to similar mails
  │
  6. DECIDE (rules over AI output)
  │   apply the autonomy policy → Level 0 / 1 / 2 / 3
  │
  7. ACT
  │   tick items · save docs · write draft · update status ·
  │   send (only Level 0–1) · log everything · notify agent
```

**Steps 1, 2 and 6 are deterministic rules.** The AI is used only in 3, 4 and 5 to read, understand and retrieve. AI never decides on its own whether a mail leaves FedEx.

---

## 2. Classifier output schema

The Azure OpenAI call in step 4 returns structured JSON:

```json
{
  "awb": "176652290871",
  "case_ref": "CD-000142",
  "intent": "documents_submitted",
  "secondary_intent": "question",
  "items_satisfied": [
    {
      "item": "corrected_invoice",
      "evidence": "attachment: Invoice_revised.pdf",
      "confidence": 0.93
    }
  ],
  "values_extracted": {
    "invoice_value": "1850",
    "currency": "USD",
    "incoterm": "CIF"
  },
  "question": "Will the duty change after the corrected value?",
  "sentiment": "neutral",
  "risk_flags": [],
  "confidence": 0.88
}
```

### 2.1 Intent labels (shared by all teams)

| Intent | Meaning |
|---|---|
| `documents_submitted` | Customer sent one or more documents |
| `details_provided` | Customer answered with field values (no documents) |
| `question_status` | "Where is my shipment?" / "What's happening?" |
| `question_process` | "What do I need to do?" / "How does clearance work?" |
| `question_charges` | "Why is the fee Rs X?" / "What are the charges?" |
| `broker_choice` | Customer choosing NFBRK or FEBRK |
| `payment_confirmation` | "I've paid" / UTR shared |
| `dispute` | Customer disagrees with a value, duty or charge |
| `complaint` | Customer is unhappy about service |
| `request_extension` | "Can I have more time?" |
| `wrong_recipient` | Mail not related to clearance |
| `unrelated` | Spam, marketing, completely off-topic |
| `thank_you` | Acknowledgment only, no action needed |
| `out_of_office` | (caught by pre-filter, but labeled if it slips through) |

### 2.2 Risk flags (any of these forces Level 3 — human only)

| Flag | When it fires |
|---|---|
| `duty_dispute` | Customer disputes the assessed duty amount |
| `legal_or_penalty` | Mention of legal action, penalty, or regulatory reference |
| `angry_or_escalation` | Angry sentiment or explicit escalation request |
| `value_changed` | Customer-stated value differs from the ACCS record by > 10% |
| `wrong_consignee` | Name in the reply doesn't match the AWB's consignee |
| `data_mismatch` | Extracted field contradicts the case record |
| `personal_data_request` | Customer asks for their data / GDPR-style request |

---

## 3. RAG knowledge base (Azure AI Search)

### 3.1 What goes in the index

| Source | Content | Updated by |
|---|---|---|
| Templates | Every active mail template (subject + body, with placeholders) | You, in app Settings |
| SOPs | Process rules: fee calculations, cutoff logic, what counts as a valid authority letter, broker options, penalty wording | You / team leads |
| Category guides | For each courier defect category: what Customs needs, common questions, typical resolutions | Courier team leads |
| Approved past replies | Every draft an agent approved (with or without edits) — the final sent version | Automatically, by the learning loop (F18) |
| Rejected drafts + reason | "Don't promise duty will not change" or "Don't cite this regulation" | Automatically, when an agent rejects a draft |

### 3.2 How RAG retrieval works per mail

1. The classified mail's context is converted to a search query: case type + category + intent + key values
2. Azure AI Search returns the top 3 nearest matches from approved past replies, plus the relevant SOP section and the template for this situation
3. These are injected into the OpenAI prompt as "reference material"
4. The AI drafts from this material, not from its general training

### 3.3 Indexing

- Documents are chunked into ~500-token segments with metadata (case type, category, intent, gateway)
- Embeddings generated by Azure OpenAI's embedding model (text-embedding-3-small)
- Stored in Azure AI Search with vector + keyword hybrid search
- Re-indexed nightly by F18 (learning loop)

---

## 4. Prompt templates

### 4.1 Classification prompt (step 4)

```
System: You are a customs clearance email classifier for FedEx Express India.
You receive a customer's reply email and the case context.
Return ONLY a JSON object matching this schema: {schema}.
Do not explain. Do not add text outside the JSON.

User:
CASE CONTEXT:
- AWB: {awb}
- Case ref: {case_ref}
- Case type: {case_type}
- Category: {category}
- Required items still missing: {missing_items}
- Declared value: {declared_value} {currency}
- Company: {company_name}

CUSTOMER EMAIL:
From: {from}
Subject: {subject}
Body: {body}
Attachments: {attachment_list}

DOCUMENT INTELLIGENCE RESULTS:
{extracted_fields_from_attachments}

Classify this email.
```

### 4.2 Draft reply prompt (step 5, for Level 2)

```
System: You are a professional customs clearance communication agent for FedEx Express India.
Write a reply email to the customer based on the case context and reference material below.

RULES:
- Use ONLY facts from the case record and retrieved sources
- Every number (amount, weight, value, fee, deadline) MUST come from the CASE DATA below
- Do NOT invent amounts, duties, deadlines or customs decisions
- Do NOT promise that duty will or will not change
- Do NOT cite regulations unless they appear in the SOP below
- If the customer asked a question you cannot answer from the data, say "we will confirm and update you"
- Keep the same email subject line
- Maximum 150 words
- Professional but warm tone
- Sign off as the agent's name (given below)

CASE DATA:
{case_fields}

REFERENCE MATERIAL (use these as style and content guides):
Template for this situation: {template}
SOP excerpt: {sop_chunk}
Similar approved past reply 1: {past_reply_1}
Similar approved past reply 2: {past_reply_2}

CUSTOMER'S EMAIL:
{customer_email_body}

Agent name: {agent_name}

Write the reply.
```

### 4.3 Number verification (post-draft check)

After the AI returns a draft, the flow extracts every number from the draft text and checks each against the case's Dataverse record:

```
For each number N found in the draft:
  - Is N in {awb, declared_value, weight_kg, pieces, amount_due, 
    fee_do_charge, fee_admin, fee_gst_total, igm_no, mawb}?
  - If YES → pass
  - If NO → block the draft, flag "unverified number {N} in draft"
           → goes to Level 3 (human review) instead of Level 2
```

This prevents the AI from inventing a fee, a duty amount or a deadline. If the draft says "Rs 3,068" and the case record shows amount_due = 3068, it passes. If the draft says "Rs 2,800" and that number appears nowhere in the record, the draft is blocked.

---

## 5. Autonomy levels

| Level | What happens | Used for | At pilot start |
|---|---|---|---|
| **0 · Auto, no mail** | System updates the case silently: ticks items, saves docs, updates status | OOO replies, bounces, "thank you", portal uploads that satisfy items with high confidence | ON |
| **1 · Auto-send, template only** | Fixed template filled with data, no AI-written free text | "Documents received", "Still missing: {items}" reminders, "Payment received — DO in process" | OFF → switched on per template after proof |
| **2 · AI draft + human approval** | Draft appears in the agent's Inbox → Approve & send / Edit / Reject | Questions, partial answers, clarifications, anything with AI-written text | ON (default for all) |
| **3 · Human only** | No draft; case flagged red with the reason | Risk flags, low confidence (< 0.7), no AWB found, disputes, complaints | ON |

### 5.1 Promotion rule (Level 2 → Level 1)

A situation earns Level 1 when:
1. At least **100 cases** have been evaluated for this situation
2. **≥ 95%** of drafts were approved without edits (edit_distance = 0 in the AI draft table)
3. **Zero** rejected drafts with a safety-related reason
4. The **supervisor** switches it on in Settings (it is never automatic)
5. It can be **switched off instantly** by the supervisor at any time

### 5.2 Demotion rule (Level 1 → Level 2)

Instant demotion (automatic) if:
- Any auto-sent mail generates a complaint
- Any auto-sent mail generates a bounce from a previously valid contact
- The supervisor switches it off

---

## 6. Learning loop (F18)

Runs nightly:

1. **Collect** all AI drafts from the last 24 hours with their outcomes (approved / edited / rejected)
2. **For approved drafts:** store the final sent text + the trigger mail context in Azure AI Search. Tag with case type, category, intent, gateway.
3. **For edited drafts:** store the final sent text (the agent's version) alongside the original draft. The edit delta teaches the model what to change next time.
4. **For rejected drafts:** store the rejection reason. These appear as negative examples in future RAG retrievals ("in situations like this, do NOT write...").
5. **Compute** approval rates per situation (case type + category + intent combination) and update the Autonomy rule table.
6. **Report** the overnight numbers to the Supervisor screen: total drafts, approval rate, candidates for Level 1 promotion.

**No model retraining happens.** The AI's behaviour changes because the RAG retrieval returns different (better) reference material over time, not because the model's weights change.

---

## 7. Document Intelligence

### 7.1 What it reads

| Document type | Model | Key fields extracted |
|---|---|---|
| Commercial invoice | Prebuilt invoice model | Invoice number, date, consignee, value, currency, line items |
| KYC | General document model | Company name, registration number, address |
| Payment screenshot (deldo@ mails) | Custom extraction prompt | UTR, amount, date, remitter name |
| Authority letter | General document model | Company name, authorised signatory |

### 7.2 How it's called

Power Automate → HTTP POST to Azure AI Document Intelligence endpoint → returns JSON with extracted fields → passed to the classifier prompt as `{extracted_fields_from_attachments}`.

### 7.3 Validation

Extracted fields are compared against the case's Dataverse record:
- Invoice value vs. declared_value → mismatch logged with both values
- Consignee name vs. company name → fuzzy match (Levenshtein distance > threshold → flag)
- UTR (from screenshot) → compared to what the customer submitted in the form (if both exist)

Mismatches don't auto-reject — they flag the item as "received, needs verification" and the agent confirms.
