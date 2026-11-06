# Clearance Desk — Build Guide

*What to build, in what order, how to test it, and how to go live. Every task is tagged [You], [Dev] or [IT].*

---

## 1. Before you start — week 0 decisions

These must be answered before any building begins. Get them moving the moment the project is approved.

| # | Question | Ask who | Impact if blocked |
|---|---|---|---|
| 1 | Does ACCS have a read API? What's the endpoint, auth, rate limits? | IT / ACCS team | Falls back to scheduled file export |
| 2 | Does the checklist approval site have an API? | Site owner | Falls back to PA Desktop robot or agent paste |
| 3 | Can Finance provide a daily bank statement file in a fixed format to SharePoint? | Finance / Treasury | UTR matching disabled; IGM confirms manually |
| 4 | Is Azure OpenAI enabled in FedEx's Azure tenant? Which region? | Azure admin | Falls back to AI Builder |
| 5 | How many Power Apps Premium licences can we get? At what cost? | IT procurement | Pilot scope shrinks |
| 6 | Is Power Pages available? What's the per-user pricing on FedEx's agreement? | IT procurement | Customer portal replaced by Forms + reply mail |
| 7 | Can agents send mail with Reply-To set to a different address? | IT / Exchange admin | Send from team mailbox instead |
| 8 | Is internal auto-forwarding of mail allowed? | IT / Exchange admin | Agents forward manually |
| 9 | Is InfoSec comfortable with Azure OpenAI processing shipment data? | InfoSec | AI engine disabled; templates only |
| 10 | Is InfoSec comfortable with external users uploading to Power Pages? | InfoSec | Documents by reply mail only |

---

## 2. Week 1 — access, workshops, test material

No building this week. Only preparation.

### 2.1 Access requests [IT]

- [ ] Power Platform environment (build) + separate test environment
- [ ] Service account with Power Apps Premium + Power Automate Premium licence
- [ ] Power Apps Premium licences for pilot users (start with 12: one courier sub-team + IGM)
- [ ] Power Pages capacity
- [ ] Azure OpenAI resource + GPT-4o deployment
- [ ] Azure AI Search resource (Standard tier)
- [ ] Azure AI Document Intelligence resource
- [ ] Team mailboxes: `trace.courier.del@`, `trace.cargo.del@` (if deldo@ is reused for IGM)
- [ ] Service account access to all three mailboxes (send + read)
- [ ] SharePoint site: "Clearance Desk DEL" with libraries: Inputs, AWB Documents, Templates
- [ ] Teams team: "Clearance Desk – DEL" with channels: Cargo, Courier, IGM, Triage, Flow alerts
- [ ] DLP policy review for the new environment
- [ ] ACCS: API credentials or file export schedule confirmed

### 2.2 Workshops [You] — one hour each

**Workshop 1 — Courier (SD + RBOE + CD) + Clearance:**
- Walk through each defect category
- Confirm the required items per category (the table from the Screen Design doc, Section 8.2)
- Collect 20 of the best hand-typed customer mails as template material
- ~~Confirm how the pull sheet is split among agents today~~ — **answered.** The sheet *is* the split, published by the division, and the app consumes it (D4). Confirm instead **which 65 rows sit on a pool** rather than a person, and name the person who resolves them. Also confirm what `MPS` means — it blocks the arrival notice (doc 17 §4, Q1)

**Workshop 2 — Cargo:**
- Confirm the Excel template columns (exact column names for `tblPreAlert`)
- Confirm the document checklist (what's mandatory for LV/MV/HV)
- Walk through the new-customer identification flow
- Confirm the CONSOL merge process and the MAWB/IGM sheet format

**Workshop 3 — IGM:**
- Confirm the CONSOL list format (`tblConsol`)
- Walk through the DO payment process
- Get a sample bank statement in the format Finance will provide
- Confirm the fee rules, cutoffs and second-Saturday / holiday list

**Workshop 4 — Compliance / Finance (30 min):**
- Confirm the fee rule: Rs 2,600 + Rs 0 admin on arrival day; Rs 2,600 + Rs 1,000 from next day; 18% GST
- Confirm the BOE late-filing penalty wording (this differs across existing templates — we store it once)
- Get the holiday list for the next 12 months

### 2.3 Collect test material [You]

- [ ] 20 real cargo AWBs with their ACCS data (masked consignee names if needed)
- [ ] 20 real courier pull rows across categories
- [ ] 10 real past customer replies (cargo and courier)
- [ ] 5 real invoices in TIFF format from ACCS
- [ ] 5 real payment screenshots from deldo@
- [ ] A sample bank statement from Finance
- [ ] The current Arrival Notice Word template

### 2.4 Solution and environment [You]

- [ ] Create a Solution called `ClearanceDesk` in the build environment
- [ ] Create environment variables:
  - `CD_TestMode` = Yes
  - `CD_TestRecipient` = your test mailbox
  - `CD_PilotAllowlist` = empty
  - `CD_Gateway` = DEL
  - `CD_CourierMailbox`, `CD_CargoMailbox`, `CD_IGMMailbox`
  - `CD_PortalBaseUrl`
  - `CD_ACCSEndpoint`
- [ ] Create connection references owned by the service account [Dev]

---

## 3. Week 2 — the record

### 3.1 Dataverse tables [You + Dev]

Create all tables from the Data Model document:
- [ ] Gateway (1 row: DEL)
- [ ] Company + Contact (import the 40k-row Excel with `name_key` computation) [Dev]
- [ ] Batch
- [ ] Case
- [ ] Required item
- [ ] Mail message
- [ ] AI draft
- [ ] Document
- [ ] Payment
- [ ] Secure link
- [ ] Error log
- [ ] All config tables: Template, Item rule, Fee rule, Cutoff, Holiday, Routing rule, Duty roster, Autonomy rule

### 3.2 Configuration data [You]

- [ ] Fee rules for DEL
- [ ] Cutoff times for DEL
- [ ] Holiday list (next 12 months)
- [ ] Routing rules (case type + category → team)
- [ ] Required item rules per case type and category
- [ ] Templates (start with 5: one cargo FEBRK, one cargo NFBRK, one cargo new customer, one courier — Missing CI, one IGM DO payment)
- [ ] Duty roster for week 3

### 3.3 Security roles [Dev]

- [ ] CD_Courier_SD, CD_Courier_RBOE, CD_Courier_CD
- [ ] CD_Cargo
- [ ] CD_IGM
- [ ] CD_Admin
- [ ] CD_Supervisor
- [ ] CD_Builder

### 3.4 Basic app screens [You]

- [ ] AWB 360 (search any AWB, see all related records)
- [ ] Settings (templates, item rules, fees, cutoffs, holidays)
- [ ] Company master search

### Done when

- [ ] You can search any of the 20 test AWBs and see the correct company
- [ ] All configuration tables are filled
- [ ] Security roles restrict a Courier agent from seeing IGM data

---

## 4. Week 3 — cargo intake and notice PDF

### 4.1 Flows [Dev]

- [ ] F01 (batch intake): reads the pre-alert Excel, validates columns, creates Batch + Case rows
- [ ] F02 (ACCS enrichment): fetches AWB data, fetches invoice files, converts TIFF → PDF, saves to SharePoint
- [ ] F03 (build request): picks template by broker type, creates required items from config, generates placeholder for the unified link token
- [ ] F06 (Arrival Notice PDF): populates the Word template → converts to PDF → saves to AWB folder

### 4.2 Screens [You]

- [ ] New batch — Cargo UBOND pre-alert (screen 3.2a from the Screen Design doc)
- [ ] Preview panel showing the filled template for any row

### 4.3 Test [You]

- [ ] Upload the 20 test AWBs
- [ ] Verify: every row shows the correct company, broker, email, status (Ready / New / No email / ACCS fail)
- [ ] Verify: Arrival Notice PDFs are generated correctly with all fields
- [ ] Verify: TIFF invoices are converted to PDF
- [ ] **Nothing is sent**

### Done when

- [ ] Today's real pre-alert Excel produces correct green/amber/red rows and correct PDFs for all 20 test AWBs

---

## 5. Week 4 — the send engine and reply matching

### 5.1 Flows [Dev]

- [ ] F05 (send engine): sends from agent's Outlook, sets Reply-To, paces at 20/min, logs message ID + conversation ID — **test mode only**
- [ ] F07 (reply intake × 3 triggers): pre-filter + matching ladder + save attachments
- [ ] F04 (CONSOL ↔ UBOND match): matches by company name (exact + fuzzy)
- [ ] Post-arrival merge screen (3.2b)

### 5.2 Screens [You + Dev]

- [ ] Batch board (3.3)
- [ ] Inbox — basic version without AI (just shows matched replies)
- [ ] Case detail — basic version (timeline + required items, no AI draft panel yet)

### 5.3 Test script [You]

From a personal Gmail (not a FedEx address), test every matching scenario:
- [ ] Reply to a pre-alert mail → should match by conversation ID
- [ ] New mail with [CG-000118] in subject → should match by case ref
- [ ] New mail with AWB 874515906172 in body → should match by AWB
- [ ] New mail from a known contact's email → should match by sender (flagged "check")
- [ ] New mail with no AWB and unknown sender → should go to Triage
- [ ] Out-of-office reply → should be logged only, not reopen
- [ ] Bounced mail → should mark contact invalid
- [ ] Mail with two AWBs → should attach to the first, create triage task for the second
- [ ] Reply to a closed case → should reopen if < 7 days, or create linked case

### Done when

- [ ] All 9 test cases land where the matching ladder says they should
- [ ] Test-mode sends arrive in your test inbox with the correct subject and body
- [ ] CONSOL ↔ UBOND merge works for exact matches and flags fuzzy matches

---

## 6. Week 5 — AI engine + portal

### 6.1 Flows [Dev]

- [ ] F08 (AI read + classify): Document Intelligence + Azure OpenAI classification
- [ ] F09 (decide + act): autonomy policy, item ticking, draft writing, number verification
- [ ] F10 (portal intake): validates token, saves fields + files, ticks items
- [ ] F20 (portal link manager): expires old tokens

### 6.2 Azure setup [Dev]

- [ ] Azure AI Search index created with: template texts, SOP content, 5 seed approved replies per category
- [ ] Azure OpenAI: classification prompt tested on 100 masked past replies (measure intent accuracy)
- [ ] Azure OpenAI: draft prompt tested on 20 cases (measure quality)
- [ ] Number verification logic tested on 10 drafts (verify every number is checked)

### 6.3 Screens [You + Dev]

- [ ] Inbox — full version with Drafts to approve / Human review / AI handled tabs (3.4)
- [ ] Case detail — full version with AI draft panel and Approve & send (3.5)

### 6.4 Portal [Dev]

- [ ] Power Pages: unified shipment page (4.1 in Screen Design doc)
- [ ] Power Pages: DO payment page (4.2)
- [ ] Token generation and code-protected access for sensitive items

### 6.5 Test [You]

- [ ] Run 100 masked past replies through the classifier (no sending)
- [ ] Measure: AWB match rate, intent accuracy, items-satisfied accuracy
- [ ] Target: AWB match ≥ 98%, intent correct ≥ 90%
- [ ] Test 5 portal uploads: files save to SharePoint, items tick on the case
- [ ] Test the number verification: create a draft with a wrong number → should be blocked

### Done when

- [ ] AI classification meets accuracy targets on the 100-mail test set
- [ ] Portal uploads work end to end
- [ ] Draft approval flow works: draft appears → agent clicks Approve → mail sent (in test mode)

---

## 7. Week 6 — courier templates and category forms

### 7.1 Templates [You]

Write the **11** courier category templates from the workshop material — the sheet's 12 `Master` values minus one, because `CI Missing` and `Missing CI` are the same category (C17). One template, two labels:
- [ ] `RBOE` (HV checklist)
- [ ] `CI Missing` — **also renders `Missing CI`**; one template, two `Master` labels
- [ ] `PIMS`
- [ ] `Invoice Objection`
- [ ] `Content` (Reason prefix `DESCI`)
- [ ] `Duty` (Reason prefix `ROD`)
- [ ] `CBE14`
- [ ] `Port Return`
- [ ] `Value Clarification` (Reason prefix `VALDS`)
- [ ] `MOC`
- [ ] `R&R`

That is **11 templates, and the list is verifiable against the sheet** — the `Master` column, deduplicated. Two `Reason` prefixes have no `Master` category of their own, `SVB` and `DGCA`, and they are compounds (`DESCI;SVB`, `DESCI;DGCA`); they render as part of `Content` with the second code retained in the remarks. Do not author a twelfth template for them.

### 7.2 Flows [Dev]

- [ ] F01 variant: courier pull sheet intake (every 10 min poll or manual upload)
- [ ] F11 (checklist approval): link generation, code-protected portal page, status sync

### 7.3 Screens [You]

- [ ] New batch — Courier exception pull (3.2c)
- [ ] Ready for ACCS (3.7)
- [ ] Admin handoff (3.8)

### 7.4 Portal [Dev]

- [ ] Per-category upload pages on Power Pages (field sets per category from the Item rule table)
- [ ] Checklist approval page (code-protected)

### 7.5 Test [You]

- [ ] Upload 20 courier pull rows across different categories
- [ ] Verify: each row produces the correct template, correct required items, correct portal link
- [ ] Test: agent reviews, edits, sends (test mode)
- [ ] Test: customer uploads via portal → items tick → case completes
- [ ] Test: Ready for ACCS → Admin handoff → BOE filed

### Done when

- [ ] 20 pull rows produce requests the Courier team would send unchanged or with light edits

---

## 8. Week 7 — IGM

### 8.1 Flows [Dev]

- [ ] F04 (CONSOL ↔ UBOND match) — already built in week 4, now tested with IGM's actual CONSOL list
- [ ] F12 (UTR matching): bank statement comparison every 30 min
- [ ] F13 (DO issued): DO + invoice sent in the customer's thread
- [ ] F16 (ICEGATE broadcast): one-click delay notice to all affected cases

### 8.2 Screens [You + Dev]

- [ ] Payments (3.6): Matched / Needs review / Waiting / Ready for DO tabs
- [ ] CONSOL match: confirm or reject fuzzy matches

### 8.3 Test [You]

- [ ] Upload 10 test payments (5 exact, 2 short, 2 not found, 1 split)
- [ ] Verify: exact matches go straight to Matched tab
- [ ] Verify: short/split/not found show the correct reason
- [ ] Verify: DO issued → customer receives DO + invoice in the same thread (test mode)

### Done when

- [ ] Test payments give correct matched / short / not-found / split results
- [ ] DO reaches the test mailbox in the correct thread

---

## 9. Week 8 — reminders, errors, metrics, parallel run

### 9.1 Flows [Dev]

- [ ] F17 (reminder sweeper): checks every 15 min, sends reminders at configured intervals, respects cutoffs and holidays, changes fee tier at midnight
- [ ] F18 (learning loop): nightly, pushes approved/edited/rejected drafts into Azure AI Search, computes approval rates
- [ ] F19 (error logger): connected to every flow's Catch block

### 9.2 Screens [You]

- [ ] Home (3.1)
- [ ] Needs attention (3.9)
- [ ] Supervisor (3.10)
- [ ] Settings: autonomy rules visible

### 9.3 Parallel run [You]

- [ ] Turn on real inputs (real pre-alert Excel, real courier pull, real IGM list)
- [ ] Test mode stays ON — all mail goes to test inbox
- [ ] Run for one full week alongside the existing manual process
- [ ] Compare: what the system would have sent vs. what agents actually sent
- [ ] Log every discrepancy and every error

### Done when

- [ ] One week of parallel run with zero wrong mails
- [ ] Every flow error has a plain-language reason in Needs attention
- [ ] Reminder timing is correct (verified against cutoff and holiday logic)
- [ ] Learning loop runs and updates approval rates

---

## 10. Week 9–10 — pilot

### 10.1 Pilot scope

- [ ] Courier CD sub-team (8–9 agents) — full flow
- [ ] One cargo agent group (5–6 agents) — full flow
- [ ] IGM team (7–8 agents) — DO payment flow
- [ ] Add 10–20 friendly regular customers to `CD_PilotAllowlist`
- [ ] Test mode OFF for allowlisted companies only

### 10.2 Daily review

Every day at 17:30, 15 minutes with each team:
- What worked?
- What broke?
- What did the AI get wrong?
- What did the agent have to do manually that the system should have handled?

### 10.3 Measure

| Metric | How measured |
|---|---|
| Time from upload to all mails sent | Batch created_at → last mail sent_at |
| Courier requests sent without edits | Drafts approved unchanged / total |
| AI draft approval rate | Approved / (approved + edited + rejected) |
| Replies auto-handled (Level 0) | Auto-handled / total inbound |
| First-response completeness | Cases complete after first customer action / total |
| Payments auto-matched | Exact matches / total |
| Same-day DO rate | DO on arrival day / arrivals |
| Inbound mails matched | (Rules 1–4) / total inbound |
| Errors per day | Error log count |
| Agent time per case (self-reported) | Daily survey |

### 10.4 Go-live checklist

- [ ] All access requests confirmed in writing
- [ ] Test mode check in every sending flow
- [ ] Try/Catch → F19 in every flow
- [ ] Templates approved by each team lead
- [ ] Fee, cutoff and BOE penalty wording confirmed by Compliance
- [ ] Duty roster filled for the next 2 weeks
- [ ] Rollback plan: turn test mode ON → work from inboxes as today
- [ ] One-page user guide per team
- [ ] Supervisor trained on autonomy settings
- [ ] Portal links tested by 3 real customers (with their consent)

---

## 11. After the pilot — what's next

| Timing | Action |
|---|---|
| Week 11–12 | Fix everything the pilot surfaced; write remaining courier category templates; tune AI prompts |
| Month 3 | Expand pilot to all Courier sub-teams + all Cargo agents at Delhi |
| Month 4 | Promote proven situations from Level 2 to Level 1 (auto-send) |
| Month 5 | Second gateway (Mumbai or Bangalore) — configuration only |
| Month 6 | AI voice calls for non-responding customers (Phase 2) |
| Month 6+ | ACCS write-back, CHA Teams guest access, mobile app — based on demand |
