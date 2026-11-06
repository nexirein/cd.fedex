# Clearance Desk — Product Requirements Document (PRD)

*Version 1.0 · September 2026 · Delhi gateway pilot*

***

## 1. The story — why we're building this

FedEx Express processes thousands of import shipments through Delhi IGI every week. Three teams — Trace Cargo, Trace Courier and IGM — handle the clearance communication between FedEx, the customer (consignee) and the Customs House Agent (CHA). Every day, these teams ask customers for documents, verify payments, generate notices, send reminders, and hand off completed cases for Bill of Entry filing.

**Today, all of this runs on email and Excel.** There is no shared system. Every handoff is a forward, every status check is a phone call, every follow-up depends on someone remembering. The result:

- Trace Cargo agents spend their morning doing VLookups on a 40,000-row Excel to find broker types and contact emails, then sending pre-alerts one by one through Outlook. New customers are called individually to ask about their CHA preference.
- Trace Courier agents receive a list of 200+ exception cases from the Clearance team and **type every customer email by hand** — no templates, no checklists, no record of what was asked or answered.
- IGM agents open every payment email sent to deldo@, read UTR numbers from screenshots, and check each one against a bank statement manually. 100% of payments are verified by a person.
- Customers receive up to 7 near-identical mails per shipment with hand-edited fee tables and no clear way to know what's still needed from them.
- There is no shared record of an AWB across Trace, IGM and the CHA. Status is found by asking another team.

**The root cause is not slow email. It is that email is being used as the system of record.** Each team keeps its own version of the truth — in an inbox, a spreadsheet or someone's memory — so every handoff is a forward and every update is a follow-up.

**Clearance Desk replaces the scattered email and Excel workflows with one platform** that sends structured requests, catches every reply, tracks what's received against a checklist, follows up automatically, and gives every team a live view of every AWB. The customer's experience improves (one link instead of seven mails) and the agent's work shrinks to judgment calls only (reviewing AI drafts, handling disputes, updating ACCS).

**We are not replacing ACCS, ICEGATE or the CHA's work.** We are automating the communication layer that sits between them.

***

## 2. Users and personas

### 2.1 Trace Cargo agent (Priya, 1 of \~20 cargo agents)

**Today:** arrives at 06:00, pulls UBOND data from ACCS, pastes it into the pre-alert Excel template, VLookups the broker and email from the 40k-row master, sends pre-alerts through Outlook one by one. At \~08:00, receives the CONSOL sheet from IGM, cross-references it with her UBOND cases. At \~10:00, receives the MAWB/IGM sheet, sends post-arrival notices with hand-edited fee tables. Spends the rest of the day chasing replies scattered across her inbox.

**Pain:** the lookup, the phone calls to new customers, the hand-editing, the chasing. \~5% of pre-alerts go to the wrong broker or wrong person.

**With Clearance Desk:** uploads the same Excel, reviews green/amber/red rows, clicks Send all. Known customers get the pre-alert automatically. New customers get a broker/CHA form on the unified link. Post-arrival notices send themselves when IGM data merges. Priya works only the Review queue (AI drafts and disputes) and the Ready-for-ACCS screen.

### 2.2 Trace Courier agent (Rahul, 1 of \~20 courier agents, sub-team CD)

**Today:** receives 20–30 exception cases from the Clearance team's pull sheet. For each one, reads the defect category and the Clearance remarks, then types a customer email from scratch. Waits for replies in his personal inbox. Judges whether the reply answers the ask. Passes completed cases back to Clearance and then to Admin for BOE filing.

**Pain:** typing every mail by hand is the single most manual task in the chain. No templates, no checklists, no reminders. No record of what was asked or answered.

**With Clearance Desk:** uploads his share of the pull sheet. The system builds a request per case from the category template, fills in AWB data from ACCS, and generates a unified link for the customer to upload documents. Rahul reviews the batch, clicks Send all. Replies are classified by AI. Rahul approves drafts and handles only the cases AI couldn't resolve.

### 2.3 IGM agent (Deepak, 1 of \~8 IGM agents)

**Today:** opens every payment email sent to deldo@, reads the UTR from a screenshot or free text, checks it against the bank statement by hand, chases partial payments, processes the DO in ACCS, and mails the DO and invoice back.

**Pain:** 100% manual checking. Missing or unreadable UTRs. Same-day DO depends on how fast an inbox is cleared.

**With Clearance Desk:** customers submit payment details through a structured form on the unified link. The system matches UTR against the bank statement every 30 minutes. Deepak works only the "Needs review" tab — short payments, split transfers, UTRs not found. Routine matches go straight to the Ready-for-DO queue.

### 2.4 Supervisor (Anjali, Courier team lead)

**Today:** no visibility into who is handling what, how many cases are stuck, or how long customers have been waiting. Finds out about problems when someone escalates by walking over.

**With Clearance Desk:** sees every agent's batch progress, response rates, pending drafts, oldest open case, and AI handling percentage. Can reassign cases when someone is on leave. Controls which AI draft types are allowed to auto-send.

### 2.5 Admin team agent (Sanjay)

**Today:** receives completed cases from Trace by email or verbal handoff. Opens ACCS, hunts for the documents in forwarded mail threads, files the BOE.

**With Clearance Desk:** sees a clean Admin handoff queue with every document already organised per AWB in SharePoint. Clicks "Mark BOE filed" when done. If something is missing, sends the case back to the Trace agent with one click and a reason.

### 2.6 Customer / consignee (the person receiving the shipment)

**Today:** receives up to 7 mails per shipment with different information, different formats and different reply-to addresses. Sends documents as email attachments. Sends payment proof as a screenshot to deldo\@. Calls the agent to ask what's still needed.

**With Clearance Desk:** receives one short mail per event (pre-alert, arrival, payment ask, reminder) with one button: "View your shipment." The link opens a page showing: shipment status, documents from FedEx (invoices, notices), documents needed from the customer (with upload boxes), payment form, and today's fee. One link, always current, works on any device.

### 2.7 CHA (Sunimpex, Jeena, or customer's own CHA)

**Today:** waits for forwarded documents from Trace. Updates by phone or mail.

**With Clearance Desk:** receives one assignment mail with a link to the AWB's documents once the checklist is complete. Replies go through the same system and appear on the case. BOE filing stays on ICEGATE; the system records "BOE filed" when the CHA confirms.

***

## 3. Requirements

### 3.1 Functional requirements

**FR-01 Batch intake:** the system must read the Clearance pull sheet (courier), the pre-alert Excel (cargo) and the IGM CONSOL/IGM sheet and create one case per AWB with the correct type and required items.

**FR-02 ACCS enrichment:** the system must fetch AWB details (consignee email, value, pieces, weight, origin, contents, invoice files) from ACCS for each case. Invoice files in TIFF format must be converted to PDF automatically.

**FR-03 Template-based request:** each case must produce a request mail filled from the correct template (by case type and defect category for courier), with all ACCS data inserted and a unified link for the customer.

**FR-04 Batch send:** the agent must be able to review all cases in a batch and send all ready cases with one click. Mails must be sent from the agent's own Outlook address with Reply-To set to the team mailbox.

**FR-05 Unified customer link:** each AWB must have a single, token-protected Power Pages link showing: status timeline, documents from FedEx (viewable and downloadable), documents needed (with upload boxes per item), forms (broker choice, payment, details), and today's computed fee.

**FR-06 Reply matching:** every reply to the team mailbox and to deldo@ must be matched to the correct case using: conversation ID, case reference in subject, AWB in subject/body, or sender-to-company match. Unmatched mails go to a Triage queue.

**FR-07 AI classification:** every inbound mail and portal submission must be classified by the AI engine: intent, items satisfied, values extracted, confidence, risk flags.

**FR-08 Autonomy levels:** the system must support four levels of AI autonomy (auto-handle, auto-send template, draft for approval, human only) configurable per situation by the supervisor.

**FR-09 Required items checklist:** every case must carry a checklist of required items (fields, documents, confirmations, internal actions) taken from configuration. The case is complete when every mandatory item is received and accepted.

**FR-10 Reminder engine:** the system must send reminders at configurable intervals (default: 4h, 8h, 24h) listing only the items still missing. Reminders must respect gateway cutoffs, holidays and fee tier changes. Optional Gupshup SMS/WhatsApp nudge at reminder 2 for opted-in customers.

**FR-11 CONSOL ↔ UBOND merge:** the system must match CONSOL AWBs to existing UBOND cases by company name (exact and fuzzy). Unsure matches go to an IGM confirmation screen. Merged cases carry both AWB numbers, the MAWB and the IGM number.

**FR-12 UTR matching:** the system must compare pending payments against the bank statement every 30 minutes. Results: exact match (auto-confirm), near match (needs review with reason), short (balance notice), not found (customer alert after 3 checks).

**FR-13 Checklist approval:** the system must support the existing FedEx checklist approval workflow by generating a code-protected link on the customer portal (wrapping the raw approval site link). Approve/decline must be tracked.

**FR-14 DO issuance:** when payment is confirmed and documents are complete, the case appears in the IGM Ready-for-DO queue. After ACCS processing, the agent uploads the DO PDF and clicks "DO issued." The DO and invoice are delivered to the customer via the unified link and a notification mail.

**FR-15 Admin handoff:** completed Trace cases must appear in the Admin team's queue with all documents organised in SharePoint. Admin marks "BOE filed" or sends the case back with a reason.

**FR-16 Gateway configuration:** every setting (mailboxes, cutoffs, fees, holidays, flight times, ACCS endpoints) must be scoped to a gateway. Adding a new gateway must require only configuration, not code changes.

**FR-17 Error visibility:** every flow failure must produce a plain-language error visible to the agent in a "Needs attention" screen with one-click retry or manual override.

**FR-18 Metrics:** the system must track and display: batch send time, first-response completeness, AI draft approval rate, auto-match rate, same-day DO rate, reminder count per case, agent case load.

### 3.2 Non-functional requirements

**NFR-01 Scale:** support 56+ concurrent agents across Trace (48) and IGM (8) at Delhi, scalable to 4 gateways.

**NFR-02 Send pacing:** outbound mail must not exceed Exchange Online limits (\~30/min per mailbox). Batch sends must be paced automatically.

**NFR-03 Security:** customer portal links must be token-protected with configurable expiry. Sensitive items (KYC, checklist approval) must require a one-time code sent to the registered email. No customer can see another AWB's data.

**NFR-04 Data residency:** all customer and shipment data must stay within FedEx's Microsoft / Azure tenant. The AI engine (Azure OpenAI) must use FedEx's own Azure subscription.

**NFR-05 Availability:** the platform must be available during Delhi working hours (06:00–20:00 IST). Scheduled maintenance outside these hours.

**NFR-06 Test mode:** every outbound mail flow must check a test-mode flag. When on, all mail goes to a test inbox with the real recipient shown in the subject.

***

## 4. Success metrics

| Metric                                                          | Baseline (today)     | Target (end of pilot)                  | How measured                               |
| --------------------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------------------ |
| Time from pull/pre-alert upload to all mails sent               | 2–4 hours (manual)   | Under 10 minutes                       | Batch created\_at → last mail sent\_at     |
| Courier exception mails typed by hand                           | 100%                 | 0% (all from templates/AI)             | Cases with no template = typed             |
| New-customer phone calls per day                                | \~15–20              | Under 5 (only non-responders)          | Call tasks created                         |
| AI draft approval rate (approved unchanged)                     | N/A                  | ≥ 80% at pilot, ≥ 95% before auto-send | Drafts approved / total drafts             |
| Replies handled without agent (Level 0–1)                       | 0%                   | ≥ 60%                                  | Auto-handled / total replies               |
| First-response completeness (customer sends everything at once) | \~30% (estimated)    | ≥ 60%                                  | Cases complete after first customer action |
| Payments auto-matched against bank                              | 0%                   | ≥ 85%                                  | Exact matches / total payments             |
| Same-day DO rate                                                | \~58% (estimated)    | ≥ 80%                                  | DO issued on arrival day / arrivals        |
| Inbound mails matched to correct case                           | N/A                  | ≥ 98%                                  | Matched / total inbound (excluding triage) |
| Agent headcount needed for same volume                          | \~48 Trace + \~8 IGM | Target: \~20 Trace + \~6 IGM           | Cases per agent per day                    |

***

## 5. Scope

### In scope (Delhi pilot, 10 weeks)

- Trace Cargo: UBOND pre-alert, CONSOL/IGM merge, post-arrival notice, document collection, CHA notification
- Trace Courier: SD, RBOE, CD exception handling from the Clearance pull
- IGM: DO payment intake, UTR matching, DO issuance, ICEGATE delay broadcast
- Admin: handoff queue, BOE filing tracking
- CHA: assignment notification, document access, BOE filed confirmation
- Customer: unified link, structured upload, payment form
- AI reply engine with four autonomy levels
- Reminder engine with Gupshup optional
- Gateway configuration for Delhi (other gateways are config, not code)

### Out of scope (Phase 2)

- AI voice calls for non-responding customers
- ACCS write-back (auto-update ACCS from the platform)
- CHA as Teams guest users (needs InfoSec approval)
- Multi-gateway rollout (Bangalore, Mumbai, Chennai)
- Mobile app for agents
- Customer SMS/WhatsApp as a primary channel (only opt-in reminders now)

### Not in scope (ever, by design)

- Replacing ACCS
- Filing BOE on ICEGATE (that's the licensed CHA's job)
- Making customs duty decisions
- Processing payments (we track them, not process them)

***

## 6. Dependencies

| Dependency                                   | Owner          | Status     | Impact if blocked                                      |
| -------------------------------------------- | -------------- | ---------- | ------------------------------------------------------ |
| ACCS API (read)                              | FedEx IT       | To confirm | Falls back to scheduled file export; slower enrichment |
| ACCS API (write)                             | FedEx IT       | Phase 2    | ACCS update stays manual from structured screen        |
| Checklist approval site API                  | Site owner     | To confirm | Power Automate Desktop robot, or agent pastes link     |
| Bank statement file/feed                     | Finance        | To confirm | UTR matching disabled; IGM confirms manually           |
| Azure OpenAI in FedEx's Azure tenant         | Azure admin    | To confirm | Falls back to AI Builder (less capable)                |
| Power Apps Premium licences (\~56 users)     | IT procurement | To confirm | Pilot with smaller group first                         |
| Power Pages (external portal)                | IT procurement | To confirm | Documents by reply mail only (loses structure)         |
| Exchange: send-as-agent with Reply-To        | IT policy      | To confirm | Send from team mailbox with agent name in signature    |
| Exchange: internal auto-forward rules        | IT policy      | To confirm | Agents forward manually (compliance issue)             |
| InfoSec: Azure OpenAI on shipment data       | InfoSec        | To confirm | AI engine disabled; templates only                     |
| InfoSec: external uploads to Power Pages     | InfoSec        | To confirm | Documents by reply mail only                           |
| Compliance: fee, cutoff, BOE penalty wording | Compliance     | To confirm | Cannot go live until confirmed                         |

***

## 7. Risks

| Risk                                       | Likelihood | Impact                                         | Mitigation                                                                      |
| ------------------------------------------ | ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Premium licences not approved              | Medium     | High — blocks the platform                     | Pilot with 12 users; prove savings; scale                                       |
| ACCS has no API                            | Medium     | Medium — slower enrichment                     | Scheduled file export; manual fields for missing data                           |
| AI misclassifies a reply                   | Low–Medium | Medium — wrong action on a case                | Level 2 (human approval) for all at pilot; Level 1 earned per situation         |
| AI invents a number in a draft             | Low        | High — wrong fee or duty sent to customer      | Every number in a draft is checked against Dataverse; mismatch blocks the draft |
| Customers ignore the unified link          | Medium     | Low — reply engine handles mail replies anyway | The link is the fast path, not the only path                                    |
| Agents keep replying from personal Outlook | Medium     | Medium — replies bypass the record             | Supervisor view shows cases with no app activity; cultural change               |
| Bank statement access refused              | Low–Medium | Medium — UTR matching disabled                 | IGM confirms from the queue manually; still faster than opening every mail      |
| Azure OpenAI region not available          | Low        | Medium — AI engine delayed                     | AI Builder as fallback (same connectors, less capable)                          |

