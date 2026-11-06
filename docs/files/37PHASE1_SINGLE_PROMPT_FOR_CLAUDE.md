# PHASE 1 BUILD PROMPT — Cargo Clearance Desk
### Copy everything below this line into Claude Code. Single prompt. End to end.

---

## YOUR SITUATION

You have write access to a live Power Apps canvas app via the **Canvas Authoring MCP server** (`canvas-authoring`). Use it. Do not clone, pack, or import solutions — edit through MCP and `sync_canvas`.

Environment: `Default-b945c813-dce6-41f8-8457-5a12c2fe15bf`
App: `PocketAI APP`, app_id `7bd4b8e4-2407-4918-acdd-f8ea72218851`
Tenant: FedEx · Maker (no Dataverse table access) · **data lives in SharePoint**
Solution: `PocketAI` · Screen1 is currently empty.

Call `mcp__canvas-authoring__connect` with `environment_id`, `app_id`, `environment_category: "prod"`. If sign-in fails, retry with `login_hint: "bipul.sikder@fedex.com"`. Confirm with `list_controls` before writing anything.

Follow the `canvas-app` and `add-data-source` skills. Read `references/YamlSyntax.md`, `references/LayoutGuide.md`, `references/PowerFxGuide.md`, `references/DesignGuide.md` before authoring.

---

## THE PRODUCT

FedEx GCC cargo clearance. Today one person types emails by hand from 06:00 and chases IGM for payment status all day. The system replaces the typing, not the judgement.

**Cargo only.** No courier. No CHA/BOE filing. India lanes, INR.

**The pitch in one line:** one Excel upload at 06:00, and everything after it is either automatic or a decision a person should be making.

### The day

```
06:00  IGM sends UBOND Excel → Trace uploads it. 28 AWBs. One upload, zero re-keying.
06:15  SYSTEM: validate · enrich from ACCS · fetch invoices (TIF→PDF) · match company
       · resolve clearance type · pick template · build checklist · generate link
       · compute fee. Trace sees 28 cases, 26 ready, 2 need attention.
06:30  PRE-ALERT SENT. One link per customer. Zero attachments.
08:00  IGM sends CONSOL → merge on company+AWB → write MAWB, IGM no, flight, arrival back.
10:00  IGM enters MAWB + IGM number. Post-arrival batch ready. Fee tier recomputed.
10:15  ARRIVAL NOTICE on the same thread. Payment instructions. Reminder clock starts.
ANY    Customer uploads on the link → checklist ticks, auto-acknowledged.
ANY    IGM verifies payment (UTR matched to bank feed) → DO issued → case closed.
15min  Reminder sweeper. Overdue → remind → remind → call task → supervisor. Max 3.
```

### Who does what

| Actor | Role |
|---|---|
| **Trace** | Owns the desk. Uploads, reviews exceptions, clicks send. |
| **IGM** | Separate team. Supplies UBOND + CONSOL + MAWB, verifies payment, issues DO. **Not** the clearance authority. |
| **Customer** | Receives a link, uploads documents, pays. Never gets attachments. |
| **System** | Validates, enriches, fetches, converts, links, reminds, classifies replies. |

---

## NON-NEGOTIABLES

Violating any of these makes the demo fail, not just look bad.

1. **Never guess.** Unresolved clearance type → Needs Attention. Ambiguous → blocked. Never fall back to a wrong template.
2. **Never silently drop a row.** Every rejected row appears on Needs Attention with a reason and a fix.
3. **Fail closed on send.** Pre-flight scans for unfilled placeholders. Any gap blocks the send.
4. **Zero attachments, always.** Documents live behind the link. Envelope carries the link only.
5. **Max 3 reminders.** Then escalate. Stops the instant the customer replies. Never fires at 23:55 or on a holiday.
6. **Confidence gate ≥ 0.85** before anything auto-sends. Below that, a human decides.
7. **Test mode on.** `CD_TestMode = Yes` makes the system inert. Four kill switches: `aiEnabled`, `autoSendEnabled`, `followupEnabled`, `callAiEnabled`.
8. **Synthetic data only.** No real AWBs, no real customers, no real money.

---

## DATA LAYER — SharePoint, not Dataverse

No Dataverse tables. Build these as **SharePoint lists** and connect via **Add data → SharePoint**. If I paste a site URL, use it; otherwise create lists in a dedicated site `ClearanceDesk_Demo` and tell me the site URL so I can verify.

| List | Purpose | Key columns |
|---|---|---|
| `CD_Shipment` | One row per AWB. The spine. | Title(AWB), Batch, Company, ContactEmail, Broker, MAWB, IGMNumber, Flight, ArrivalDate, ClearanceType, TemplateName, FeeINR, Status, SendState, ReminderCount, LinkToken, LinkExpiry, TestMode |
| `CD_ShipmentEvent` | Append-only audit trail. Every state change. | Title, AWB, EventType, Detail, Actor, Timestamp |
| `CD_Document` | Documents on a case. | Title, AWB, DocType, Format, Visibility, FileId, UploadedBy, UploadedAt |
| `CD_Participant` | Customer / IGM / CHA / broker per shipment. | Title, AWB, Role, Name, Email, Phone |
| `CD_Task` | Unit of work. | Title, AWB, TaskType, Owner, DueAt, Status, Priority |
| `CD_Message` | Inbound and outbound, decision recorded. | Title, AWB, Direction, Subject, Body, Decision, Confidence, SentAt |
| `CD_AIDecision` | What the classifier chose and why. | Title, AWB, Path(Auto/Draft/Escalate), Confidence, Reason, RiskFlag, CreatedAt |
| `CD_DocumentType` | What each clearance type requires. | Title, ClearanceType, DocType, Mandatory, Order |
| `CD_Broker` | Jeena, Sunimpex, CHA, rules. | Title, BrokerCode, BrokerName, Rules, Active |
| `CD_Setting` | Test mode, fees, SLA. | Title, SettingKey, SettingValue |

`Title` is the SharePoint default column — map it to AWB.

---

## BUSINESS RULES

### Fees — arrival day vs next day onward

| Tier | Calculation | Total |
|---|---|---|
| Arrival day | ₹2,600 + ₹468 GST | **₹3,068** |
| Next day onward | ₹3,600 + ₹648 GST | **₹4,248** |

The ₹1,180 difference is the delta, not a standalone fee. Recompute the tier live — a Reminder 2 arriving the next day must restate ₹4,248, and the customer sees the number change and why.

### Clearance types → template

| Type | Broker | Template |
|---|---|---|
| `NFBRK` | Own broker | Cargo Pre-Alert — NFBRK |
| `FEBRK-JEENA` | Jeena | Cargo Pre-Alert — Jeena |
| `FEBRK-SUNIMPEX` | Sunimpex | Cargo Pre-Alert — Sunimpex |

Bare or ambiguous → blocked, explained, never guessed.

### Invoice fetch — the quota trap

```
WRONG   28 × "get invoice for this AWB"          = 28 flow runs, quota gone on a big batch
RIGHT   1 × "get invoices for this whole batch"   = 1 run, 28 inside the loop
```

One HTTP call per batch. Loop inside. Partial failure is normal — the response says which AWBs worked, retry only those.

### TIF → PDF

Conversion logic already exists — port it, don't reinvent. Order: Word Online first (no code, no hosting), Azure Function as fallback.

`.tif` and `.xlsx` → PDF. `.docx` stays DOCX (the DO format and bank details must stay fillable). Everything else rejected. The customer only ever receives PDF or DOCX.

### Reminder schedule

| When | What | Detail |
|---|---|---|
| On send | Clock starts | Timer per case, anchored to send time |
| **T+4h** | Reminder 1 | Short. Fee and link. Nothing aggressive. |
| **T+8h**, or 2h before cutoff | Reminder 2 | Penalty warning. Fee tier restated. |
| No response | Call task | Cargo new customers. A human calls. |
| Still nothing | Supervisor escalation | Visible on the supervisor queue. |
| Customer responds | **Clock stops immediately** | No more reminders. This is the rule that makes it safe. |

**Hard cap 3.** Respect cutoffs and holidays.

### Reply classifier — three paths

Already proven in `cargo-paf`. Port it.

| Path | When | What happens |
|---|---|---|
| **Auto** | Confidence **≥ 0.85**, no risk flag | System replies. Document received, payment confirmed, fee query answered, OOO and bounces absorbed. |
| **Draft** | Confidence 0.6–0.85, or a value needs checking | Draft written, human clicks send. **Every number verified before the draft is created.** |
| **Escalate** | Below 0.6, or risk flag, or dispute | Goes to a human with the reason. |

Pre-filters before classification: out-of-office, bounce, internal → absorbed silently. Then match to case by thread → case ref → AWB → sender.

**The 85% gate is the safety story. Say it in the demo:** *the system automates what it is sure about and hands over everything else.* That one sentence is what makes this approvable for real use.

---

## SCREENS TO BUILD — 8

Build in this order. Sync after each one.

**1. Batch Upload** — Drop the UBOND Excel. Validate against the known column set. Show accepted/rejected counts with the reason per rejection. Rejected rows are never dropped. Then create the batch.

**2. Batch Board** — The batch as a whole. Progress, ready vs blocked, one click to send pre-alerts. Paced 20/min. Show the pre-flight result before anything sends.

**3. Needs Attention** — Rejected rows and blocked cases. Each with the reason and the fix. This is where "never guess" becomes visible. Grouped by reason.

**4. Case Detail** — One AWB. Everything: documents, checklist with pre-ticked required items, timeline, fee with the tier explained, send state, reminder count.

**5. IGM Panel** — MAWB + IGM number entry, payment verification, DO issue. DO PDF goes to the link, customer notified in thread, broker notified, case closed.

**6. AI vs Human Board** — Two columns. What the system handled, what needs a person. Show confidence and reason per item. This is the differentiator.

**7. Customer Link** — What the customer sees. Converted invoice, fixed documents, upload control, checklist, fee, status. Token-based, expiring, per-shipment. **No attachments anywhere.**

**8. Timeline** — Every state change on one AWB, timestamped, with actor. The audit trail.

**Kill switches on the front screen:** `aiEnabled`, `autoSendEnabled`, `followupEnabled`, `callAiEnabled`, plus `CD_TestMode`.

---

## FLOWS TO BUILD

| # | Flow | Trigger | Notes |
|---|---|---|---|
| 1 | Upload UBOND | File lands in `/Inbound/` | Validate headers, detect duplicates, produce accepted/rejected |
| 2 | Enrich | Child of 1 | HTTP to ACCS. Rate-limited. Failure → Needs Attention, never a dropped row |
| 3 | Fetch invoices | Child of 1 | **One call per batch**, loop inside |
| 4 | TIF → PDF | Child of 3 | Word Online first, Function fallback |
| 5 | Resolve type + template | Child of 2 | 3 branches. Unresolved → blocked |
| 6 | Build checklist | Child of 5 | Pre-ticked per clearance type |
| 7 | Generate link | Child of 5 | Secure token, expiry, per-shipment |
| 8 | Compute fee | Child of 5 | ₹3,068 / ₹4,248, recomputed on arrival date |
| 9 | Pre-flight | Before 9 | Scan every placeholder. Any gap **blocks the send** |
| 10 | Send pre-alert | Agent clicks Send | Office 365 Outlook. From agent's mailbox, Reply-To team mailbox. Case ref in subject. **Zero attachments.** 20/min |
| 11 | CONSOL merge | IGM uploads | Merge on company + AWB. Exact → auto-link. Fuzzy → "Unsure", agent confirms. Unmatched → post-arrival case, never a duplicate |
| 12 | Reminder sweeper | **Recurrence 15 min** | Cap 3. Stop on reply. Respect cutoffs/holidays |
| 13 | Payment check | **Recurrence 30 min** | Exact UTR → confirmed. Diff → Needs Attention. Not found after 3 → alert |
| 14 | DO issued | IGM action | PDF → link → customer → broker → case closed |
| 15 | Reply intake | Outlook trigger, cargo mailbox | 3 pre-filters, then match by thread → case ref → AWB → sender |
| 16 | Classify + act | Child of 15 | 3 paths, 0.85 gate |

**Connection rule:** never hardcode a connection reference. Every connector uses a symbolic name mapped in the solution's connection references. Register every flow as a `RootComponent` of type 29. Wrap risky work in a `Scope` with a sibling error-handling scope on `runAfter: Failed`.

---

## DESIGN

Provisional FedEx-adjacent theme. Purple `#4D148C` primary. Pure orange `#FF6600` **only** for logo and decoration — never as a fill behind text. Orange fill `#C95100`, orange text `#B34700` for contrast. Segoe UI. White cards on a light neutral background, generous padding, 8px spacing scale.

**Accessibility is not optional.** 4.5:1 for body text, 3:1 for large text and UI borders. Keyboard navigable. Visible focus. Every colour-coded state also carries a text label — never colour alone.

Ship it tablet-first, 1366×768, matching the existing app's form factor.

---

## SUCCESS CRITERIA — verify each, then say so

| # | Criterion |
|---|---|
| 1 | Synthetic UBOND Excel, 28 rows → 28 cases, **zero manual entry** |
| 2 | Invoices auto-fetched and converted to PDF |
| 3 | Correct template per clearance type; blocked rows explained |
| 4 | Pre-alert sent with a link and **zero attachments** |
| 5 | Customer uploads on the link; checklist ticks |
| 6 | CONSOL merged; MAWB/IGM/flight written back |
| 7 | Reminders 1 and 2 fire on schedule, capped at 3, stop on reply |
| 8 | IGM verifies payment; DO issues; case closes |
| 9 | **A deliberately broken case surfaces with a correct reason** |
| 10 | Timeline shows every state change on any AWB |

Criterion 9 is the credibility test. Build it on purpose — a missing MAWB, a bad AWB, an unresolvable type. If a broken case is dropped silently instead of explained, the system is not trustworthy and I would rather know now.

---

## BUILD ORDER

1. Connect MCP, confirm with `list_controls`
2. Create/verify the 10 SharePoint lists
3. Connect SharePoint as a data source
4. **Batch Upload screen** — first working end-to-end
5. Enrich + validate + fee + template flows
6. **Case Detail** — the spine
7. Send pre-alert
8. **Customer Link**
9. CONSOL + IGM Panel
10. Reminder sweeper + payment check
11. **AI vs Human Board**
12. Needs Attention + Batch Board
13. Timeline
14. **Seed 28 synthetic shipments and prove criterion 9**

---

## REPORT BACK

After each screen, state: what you built, what you verified, what is stubbed, what blocked you.

At the end give me: (a) which of the 10 criteria you actually proved versus asserted, (b) the SharePoint site URL and list names, (c) every flow and its current state, (d) anything that needs a real API credential, (e) an honest list of what is thin.

**Do not claim something works because it looks right. If you could not verify it, say you could not verify it.** A demo that admits its boundaries gets approved. One that overclaims gets audited and the whole thing is switched off.
