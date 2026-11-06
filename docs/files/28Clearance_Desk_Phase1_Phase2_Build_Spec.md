# Phase 1 & Phase 2 Build Specification — Cargo Clearance
## Excel Upload → UBOND → CONSOL → Reminders → DO

**Prepared for:** Gateway Manager · Shobin · FedEx GCC
**Purpose:** complete build spec — every screen, every flow, how each is built in Power Automate and Power Apps, and a ready-to-paste Miro AI prompt for both phases.
**Status:** specification. Nothing built yet.
**Companion docs:** 27 (the flow), 26 (scope), 12 (F-numbers), 7 (screens), 8 (locked decisions)

---

## 1. The daily rhythm — one page

This is the process the system follows, and the order the team lives it.

```
06:00   ──  UBOND arrives  ────────────────────────────────────────────
          IGM sends the UBOND sheet. Trace uploads it to Clearance Desk.
          ONE Excel upload. 28 AWBs. That is the only manual data entry
          in the whole day.

06:15   ──  SYSTEM BATCHES (automatic) ────────────────────────────────
          Validate every row · enrich from ACCS · fetch invoices (TIF→PDF)
          · match company · resolve clearance type · pick the right template
          · build the required-item checklist · generate the secure link
          · compute the fee (₹3,068 / ₹4,248)
          Trace sees: 28 cases, 26 ready, 2 need attention.

06:30   ──  PRE-ALERT SENT ────────────────────────────────────────────
          One link per customer. No attachments. The link carries the AWB,
          the converted invoice, the fixed documents, and the checklist.

          ▼  customer opens the link whenever they want, any time, for days

08:00   ──  CONSOL arrives from IGM ────────────────────────────────────
          IGM uploads the CONSOL sheet. System merges on company + AWB.
          Writes MAWB, IGM number, flight, arrival date back onto each case.
          32 rows: 30 auto-matched, 2 land on "Unsure" for an agent.

10:00   ──  MAWB / IGM from IGM ────────────────────────────────────────
          IGM enters MAWB + IGM number per AWB. Post-arrival batch becomes
          ready. Fee tier recomputed — arrival day vs next day.

10:15   ──  ARRIVAL NOTICE SENT ───────────────────────────────────────
          Same thread. Arrival notice PDF on the link. Payment instructions.
          Reminder clock starts.

          ▼  the customer now has everything and owes us documents + payment

ANY TIME ──  CUSTOMER SUBMITS on the link ─────────────────────────────
          Uploaded documents land on the case. The system reads them,
          ticks the checklist, acknowledges automatically.

ANY TIME ──  IGM VERIFIES PAYMENT ─────────────────────────────────────
          UTR matched against the bank statement every 30 minutes.
          Matched → confirmed automatically. Unmatched → a person looks.

ANY TIME ──  REMINDER SWEEPER, every 15 minutes ───────────────────────
          Overdue → Reminder 1 → Reminder 2 → call task → supervisor.
          Maximum 3. Stops the moment the customer responds.

         ┌──────────────────────────────────────────────┐
         ▼                                              │
    DO ISSUED ── IGM uploads the DO, clicks DO issued  │
         │  Link updated, customer told, case closed   │
         │  Broker/CHA notified with their own link    │
         └──────────────────────────────────────────────┘
```

**The one sentence for GCC:** *one Excel upload at 06:00, and everything after it is either automatic or a decision a person should be making.*

---

## 2. Phase 1 — what we build without the FedEx tenant

**Trial Dataverse environment. Synthetic data. Two weeks.**

### 2.1 Screens to build — 8 total

| # | Screen | Type | Purpose |
|---|---|---|---|
| **P1-1** | **Batch Upload** | Power Apps, canvas | Drop the UBOND Excel. See rows accepted/rejected, then create the batch |
| **P1-2** | **Batch Board** | Power Apps | The batch as a whole — progress, ready/blocked, one click to send |
| **P1-3** | **Needs Attention** | Power Apps | Rejected rows and blocked cases, each with the reason and a fix |
| **P1-4** | **Case Detail** | Power Apps | One AWB. Everything: documents, checklist, timeline, fee, send state |
| **P1-5** | **IGM Panel** | Power Apps | MAWB/IGM entry, payment verification, DO issue |
| **P1-6** | **AI vs Human Board** | Power Apps | Two columns. What the system handled, what needs a person |
| **P1-7** | **Customer Link** | Power Apps embedded, or Power Pages | What the customer sees. Documents, upload, fee, status |
| **P1-8** | **Timeline** | Power Apps | Every state change on one AWB, timestamped. The audit trail |

**Not built in Phase 1:** Home dashboard, Admin/Settings, Supervisor view, Courier anything, Metrics.

### 2.2 The flow — how each step is actually built

| Step | Built with | Trigger | What it does |
|---|---|---|---|
| **Upload UBOND** | Power Apps file picker → **SharePoint** document library | On file upload | File lands in `/Inbound/`. Flow validates headers against the known column set. Rows that fail go to Needs Attention — **never silently dropped** |
| **Validate** | Power Automate, Excel Online | Child of upload | Checks required columns, AWB format, date validity, duplicate detection. Produces accepted/rejected counts |
| **Enrich** | Power Automate, HTTP action | Child of validate | Calls the ACCS endpoint per AWB. Company, contact email, broker, pieces, weight, value, currency, flight. Rate-limited. Failure → Needs Attention, not a dropped row |
| **Fetch invoices** | Power Automate, HTTP | **One call for the whole batch** | See §2.3 — this detail matters |
| **TIF → PDF** | Power Automate, Word Online / Azure Function | Child of fetch | See §2.4 |
| **Resolve clearance type** | Power Automate, conditions | Child of enrich | Three branches: **NFBRK** (own broker), **FEBRK–Jeena**, **FEBRK–Sunimpex**. Unresolved → Needs Attention. **Never guess** |
| **Pick template** | Power Automate, switch | Child of type | One of 3 cargo templates. Bare/ambiguous type → blocked, never falls back to the wrong template |
| **Build checklist** | Dataverse rows | Child of type | Pre-ticked required items per clearance type |
| **Generate link** | Power Automate, GUID | Child of template | Secure token, expiry set, customer URL created |
| **Compute fee** | Power Automate, expression | Child of type | **₹2,600 + ₹468 GST = ₹3,068** arrival day. **₹3,600 + ₹648 = ₹4,248** next day onward |
| **Pre-flight check** | Power Automate | Before send | Scans every placeholder. Any unfilled → **block the send.** Fail-closed, never send a broken template |
| **Send** | Power Automate, Office 365 Outlook | Agent clicks Send | From the agent's own mailbox, Reply-To the team mailbox. Case ref in the subject. **Zero attachments.** Paced 20/min |
| **CONSOL upload** | Same screen, new mode | IGM uploads | Merge on company + AWB. Exact → auto-link and write MAWB/IGM/flight/arrival back. Fuzzy → **"Unsure" screen**, agent confirms. Unmatched → post-arrival-only case, never a duplicate |
| **Reminder sweeper** | Power Automate, **Recurrence every 15 min** | Timer | See §2.5 |
| **Payment check** | Power Automate, Recurrence every 30 min | Timer | Compare pending UTRs to the bank statement. Exact → confirmed. Diff → Needs Attention with reason. Not found after 3 checks → alert |
| **DO issued** | Power Apps button + Outlook | IGM action | DO PDF uploaded → attaches to the **link** → customer notified in thread → broker notified → case closed |
| **Reply intake** | Power Automate, Outlook trigger | New mail in the cargo mailbox | 3 pre-filters first: out-of-office, bounce, internal → absorbed silently. Then match to a case by thread, then case ref, then AWB, then sender |
| **Classify + act** | Power Automate | Child of intake | Three paths — see §2.6 |

### 2.3 Invoice fetch — the quota trap

**This is the one design decision that will bite if we get it wrong.**

Power Automate has a request quota. Calling the API once per AWB on a 28-row batch is 28 runs. On a 500-row batch it is 500 runs — and the quota is gone, every other flow throttles, and the demo dies mid-presentation.

```
WRONG   28 × "get invoice for this AWB"          =  28 flow runs
RIGHT   1 × "get invoices for this whole batch"   =   1 flow run, 28 inside
```

So: **one call for the batch, loop inside, return per-AWB results.** Partial failure is normal — the response says which AWBs worked and which didn't, and we retry only the failures.

### 2.4 TIF → PDF — already written

The conversion code exists in `cargo-paf` — `src/lib/tiff/pool.ts` and `zip.ts`, roughly 200 lines. **This is a port, not a build.**

Order of attempts: Word Online first (no code, no hosting), Azure Function as fallback. `.tif` and `.xlsx` become PDF. `.docx` stays DOCX because the DO format and bank details are fillable. Everything else rejected. The customer only ever receives PDF or DOCX.

### 2.5 The reminder system — the part that saves the most time

**Every 15 minutes**, the sweeper looks for cases that are past due.

| When | What fires | Detail |
|---|---|---|
| On send | Clock starts | Timer per case, anchored to send time |
| **T+4 hours** | **Reminder 1** | Short. Fee and link. Nothing aggressive |
| **T+8 hours**, or 2h before cutoff | **Reminder 2** | Penalty warning. Fee tier restated |
| No response | **Call task** — cargo new customers | A human calls. Generated, not forgotten |
| Still nothing | **Supervisor escalation** | Visible on the supervisor queue |
| Customer responds | **Clock stops immediately** | No more reminders. This is the rule that makes it safe |

**Hard cap: 3 reminders.** Then it stops and escalates. An unbounded reminder loop is how a system gets switched off.

**Cutoffs and holidays are respected.** A reminder must never fire at 23:55 or on a holiday.

**Fee tier recomputed live.** Reminder 2 arriving the next day restates ₹4,248, not ₹3,068. The customer sees the number change and why.

**No shipping of cargo-paf's cron.** It is dead (`vercel.json` is empty) and its `hold_daily` job had 999 retry attempts. Both explicitly rejected. Built fresh.

### 2.6 Three paths — the AI decision model

Already built and demoed in `cargo-paf`. Ported, not invented.

| Path | When | What happens |
|---|---|---|
| **Auto** | Confidence **≥ 0.85** and no risk flag | System replies. Document received, payment confirmed, fee query answered, OOO and bounces absorbed |
| **Draft** | Confidence 0.6–0.85, or a value needs checking | A draft is written, a human clicks send. **Every number verified before the draft is created** |
| **Escalate** | Below 0.6, or a risk flag, or a dispute | Goes to a human with the reason |

**The 85% gate is the safety story.** Say it out loud in the demo: *the system automates what it is sure about and hands over everything else.* That single sentence is what makes this approvable for real use.

**Four kill switches**, all on the front screen: `aiEnabled`, `autoSendEnabled`, `followupEnabled`, `callAiEnabled`. And `CD_TestMode = Yes` makes the whole system inert.

### 2.7 Data model — 10 tables

| Table | Purpose |
|---|---|
| `cd_shipment` | One row per AWB. The spine |
| `cd_shipment_event` | Every state change, append-only. The audit trail |
| `cd_document` | Documents with type, format, visibility |
| `cd_participant` | Customer, IGM, CHA, broker — per shipment |
| `cd_task` | A unit of work, owner, due time |
| `cd_message` | Inbound and outbound, with the decision recorded |
| `cd_ai_decision` | Path, confidence, reason |
| `cd_document_type` | What each clearance type requires |
| `cd_broker` | Jeena, Sunimpex, CHA, with rules |
| `cd_setting` | Test mode, fees, SLA hours |

**Ten, not 34.** These are a strict subset of the production design. Nothing is thrown away later, and the event spine is the same shape.

### 2.8 Phase 1 success criteria

| # | Criterion |
|---|---|
| 1 | One synthetic UBOND Excel with 28 rows → 28 cases, zero manual entry |
| 2 | Invoices auto-fetched and converted to PDF |
| 3 | Correct template chosen per clearance type, blocked rows explained |
| 4 | Pre-alert sent with a link and **zero attachments** |
| 5 | Customer uploads on the link; checklist ticks |
| 6 | CONSOL sheet merged; MAWB/IGM/flight written back |
| 7 | Reminder 1 and 2 fire on schedule, capped at 3, stop on reply |
| 8 | IGM verifies a payment; DO issues; case closes |
| 9 | **A deliberately broken case surfaces with a correct reason** |
| 10 | Timeline shows every state change on any AWB |

---

## 3. Phase 2 — what the FedEx environment unlocks

**Same flows. Different connections.** This is the whole argument for building Phase 1 first.

### 3.1 Screens added

| # | Screen | New capability |
|---|---|---|
| **P2-1** | **Home** | Your numbers, what needs you now, today's batches, the timeline |
| **P2-2** | **Inbox** | AI-processed reply stream, drafts to approve, human review queue |
| **P2-3** | **Cases list** | All cases, AWB search, filters, bulk actions |
| **P2-4** | **Admin / Settings** | Templates, fee rules, checklist rules, broker rules, test mode |
| **P2-5** | **Supervisor** | Cross-team view, escalation queue, gateway switcher |
| **P2-6** | **Metrics** | AI handled %, approval rate, time-to-send, exceptions by type |
| **P2-7** | **Courier screens** | The same pattern applied to the courier MVP |
| **P2-8** | **Production Power Pages** | Public customer portal with real authentication |

### 3.2 What the environment changes

| Capability | Unlocked by | Manual work removed |
|---|---|---|
| **ACCS write-back** | ACCS API write permission | Trace stops keying the same data twice. **The single biggest remaining chunk** |
| **Bank statement feed** | Finance approval | UTR matching fully automatic every 30 min. IGM stops opening individual mails — **that is 100% manual today** |
| **Real email** | Exchange send-as-agent | Real sends, replies routed to team mailboxes |
| **Production Power Pages** | Power Pages licence | Public portal, real customers |
| **Full 34-table schema** | Dataverse provisioning | Courier joins the same system. No second build |
| **Azure OpenAI + AI Search + Document Intelligence** | Azure subscriptions | Classification moves from rules to document understanding. The 85% gate gets smarter |
| **Compliance sign-off** | Compliance team | Wording, fees, cutoffs. **Never automated — must be a human** |
| **Managed Environment + DLP** | Power Platform admin | Production-grade flows, data-loss-prevention policy |

### 3.3 The numbers

| Stage | Manual work | What is left |
|---|---|---|
| **Today** | 100% | Everything |
| **Phase 1 demo** | **20%** | Genuine exceptions, judgement calls, IGM confirmation |
| **Phase 2 production** | **5%** | Exceptions and Compliance sign-off. **Irreducible** |

**Claiming 0% manual in customs clearance loses the room.** A system that admits its boundaries gets taken seriously. One that overclaims gets audited.

---

## 4. Screens — detailed

### P1-1 · Batch Upload

```
┌─ New Batch · Cargo · UBOND Pre-Alert ──────────────────────────────┐
│                                                                      │
│  ┌────────────────────────────────────────────┐                     │
│  │   Drop the UBOND Excel here                │                     │
│  │   .xlsx only                               │                     │
│  └────────────────────────────────────────────┘                     │
│                                                                      │
│  GATEWAY   [ DEL ▾ ]        CLEARANCE PHASE  [ Pre-alert ▾ ]      │
│                                                                      │
│  ── After upload ──────────────────────────────────────────────     │
│  RESULT                                                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│  │   28   │ │   26   │ │    2   │ │    0   │                       │
│  │ loaded │ │ ready  │ │ review │ │ error  │                       │
│  └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                      │
│  ⚠ 2 rows need attention                    [ Review →]            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 874515906172 · consignor "N/A"        Company not matched     │   │
│  │ 874515906173 · freight "USD 0"       Freight value is zero   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  FEE TIER   Arrival day ₹3,068  ·  Next day ₹4,248                │
│                                                                      │
│                                    [ Discard ]   [ Create 26 cases ]│
└──────────────────────────────────────────────────────────────────────┘
```

**Why this screen matters:** the two problem rows are visible *before* anything is created. The agent fixes or accepts them knowingly. Nothing fails silently, ever.

### P1-2 · Batch Board

```
┌─ Batch · UBOND · 2026-09-28 06:00 ────────────────────────────────┐
│                                                                      │
│  ●●●●●●●●●●●●●●●●●●●●○○  26 of 28 sent · 71%                      │
│                                                                      │
│  ┌──────────┬──────────┬────────┬────────┬──────────┬────────┐    │
│  │   AWB    │Consignor │  Type  │  Fee   │   State  │  Send  │    │
│  ├──────────┼──────────┼────────┼────────┼──────────┼────────┤    │
│  │874515906 │ALSTOM    │NFBRK   │ ₹3,068 │ Ready    │ Sent   │    │
│  │874515907 │PINKCITY  │FEBRK-J │ ₹3,068 │ Ready    │ Sent   │    │
│  │874515908 │GALLANT   │NFBRK   │ ₹3,068 │ Needs    │ Blocked│    │
│  │874515909 │JAIN GEMS │FEBRK-S │ ₹3,068 │ Ready    │ Sent   │    │
│  └──────────┴──────────┴────────┴────────┴──────────┴────────┘    │
│                                                                      │
│  [ Send all ready (24) ]   [ Review blocked (2) ]                  │
└──────────────────────────────────────────────────────────────────────┘
```

### P1-4 · Case Detail

```
┌─ Case · 874515906172 · ALSTOM PVT LTD ────────────────────────────┐
│  NFBRK · Delhi · Arrived 28 Sep     Fee ₹3,068   [ Send pre-alert ]│
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ⏱ TIMELINE                                                   │  │
│  │ 28 Sep 06:15  Case created from UBOND upload                │  │
│  │ 28 Sep 06:16  ACCS enriched · company matched                │  │
│  │ 28 Sep 06:16  Invoice fetched · TIF → PDF ✓                  │  │
│  │ 28 Sep 06:17  Template selected · NFBRK pre-alert            │  │
│  │ 28 Sep 06:17  Link generated · expires 04 Oct               │  │
│  │ 28 Sep 06:18  Pre-alert sent · msg 0193...                  │  │
│  │ 28 Sep 09:04  Customer opened link                          │  │
│  │ 28 Sep 09:11  Invoice + packing list uploaded ✓  2 of 3     │  │
│  │ 28 Sep 10:30  Reminder 1 scheduled · fires 13:18            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  DOCUMENTS (4)                          CHECKLIST (3)              │
│  ▸ AWB / CI                    PDF ✓      ▢ Commercial invoice      │
│  ▸ Commercial invoice         PDF ✓      ▢ Packing list       ✓    │
│  ▸ Packing list               PDF ✓      ▢ KYC / authorisation ▢   │
│  ▸ Bank details               DOCX                            │
└──────────────────────────────────────────────────────────────────────┘
```

**The timeline is the asset.** It is one column, it needs no explanation, and it is what convinces a technical audience this is a process model rather than a mailer.

### P1-5 · IGM Panel

```
┌─ IGM · AWB 874515906172 ─────────────────────────────────────────┐
│                                                                      │
│  MAWB / IGM                                                          │
│  MAWB NUMBER   [ 1234567890 ]      IGM NO  [ IGM-2026-887 ]        │
│  FLIGHT NO     [ AI 154 ]          ARRIVAL   [ 28 Sep ]           │
│                                    [ Save & build post-arrival ]    │
│                                                                      │
│  PAYMENT                                                              │
│  UTR RECEIVED   [ 789456123 ]      AMOUNT  [ ₹ 3,068 ]            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  06:30  no statement match     check 1                       │   │
│  │  07:00  no statement match     check 2                       │   │
│  │  07:30  no statement match     check 3 → ESCALATE to human   │   │
│  └──────────────────────────────────────────────���───────────────┘   │
│  [ Needs review ]                                                    │
│                                                                      │
│  DELIVERY ORDER                                                       │
│  ┌────────────────────────────────────────────┐  [ Upload DO PDF ]  │
│  │  Select the DO file…                       │                     │
│  └────────────────────────────────────────────┘                    │
│  [ Issue DO · notify customer · close case ]                        │
└──────────────────────────────────────────────────────────────────────┘
```

**This is the screen that closes the loop.** Payment verified and DO issued on one screen is the strongest thing in the demo.

### P1-6 · AI vs Human Board

```
┌─ Today ────────────────────────────────────────────────────────────┐
│                                                                      │
│  ⚡ AI HANDLED (14)              👤 NEEDS A HUMAN (3)               │
│  ┌──────────────────────────┐   ┌──────────────────────────────┐  │
│  │ 874515906172             │   │ 874515908 · 42 min           │  │
│  │ Invoice received         │   │ Company not matched  ▁ 0.31   │  │
│  │ auto-acknowledged  ✓ 0.97│   │ [ Claim ]                     │  │
│  ├──────────────────────────┤   ├──────────────────────────────┤  │
│  │ 874515906174             │   │ 874515911 · 1h 20m           │  │
│  │ Payment UTR matched      │   │ UTR not found after 3 checks  │  │
│  │ confirmed        ✓ 0.99 │   │ [ Claim ]                     │  │
│  ├──────────────────────────┤   ├──────────────────────────────┤  │
│  │ 874515906176             │   │ 874515915 · 2h 05m           │  │
│  │ "What are my charges?"   │   │ Customer dispute  ▁ escalated │  │
│  │ auto-answered    ✓ 0.94 │   │ [ Claim ]                     │  │
│  ├──────────────────────────┤   └──────────────────────────────┘  │
│  │ 874515906178             │                                       │
│  │ Out of office — absorbed │   Auto-send paused for these.        │
│  │ silently            ✓ 0.99│   Nothing went out unreviewed.     │
│  └──────────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**The confidence score is shown per row.** That is the substance — not a filter, a judgement with a number attached and a reason.

### P1-7 · Customer Link

```
┌────────────────────────────────────────────────────────────────┐
│  FedEx                        Shipment 874515906172        [DEL]│
├────────────────────────────────────────────────────────────────┤
│  Your shipment                                                  │
│  ALSTOM PVT LTD · AWB 874515906172 · Arrived 28 Sep 2026       │
│                                                                  │
│  ┌── DOCUMENTS WE HAVE ───────────────────────────────┐         │
│  │  ✓  AWB / CI                            PDF      [View]│        │
│  │  ✓  Commercial invoice                   PDF      [View]│        │
│  │  ⠿  Packing list                          —  [Upload]│        │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  ┌── DOCUMENTS WE NEED FROM YOU ──────────────────────┐         │
│  │  1  Commercial invoice       ✓ received            │         │
│  │  2  Packing list             upload by 30 Sep      │         │
│  │  3  KYC / authorisation      upload by 30 Sep      │         │
│  │                                                                │
│  │  PDF or DOCX only. One file at a time.              │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  ┌── PAYMENT ─────────────────────────────────────────┐         │
│  │  ₹3,068        includes ₹468 GST                    │         │
│  │  Account details ▾            UTR: [__________]     │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  [ Upload document ]  [ Submit payment details ]                │
└────────────────────────────────────────────────────────────────┘
```

**Nothing in the email. Everything here.** Fee, documents owed, documents received, payment. One page, no login beyond the link token.

---

## 5. Team responsibilities

| Team | Phase 1 | Phase 2 |
|---|---|---|
| **Trace** | Upload UBOND, review blocked rows, send, handle escalations | Same, plus ACCS write-back means no re-keying |
| **IGM** | Upload CONSOL, enter MAWB/IGM, verify payment, issue DO | Same, plus bank feed automates UTR matching |
| **Clearance Admin** | Review templates and fee rules | Compliance sign-off, gateway config |
| **Power Platform / IT** | Provision trial env | Provision Managed Environment, connections, licensing, DLP |
| **Finance** | — | Bank statement feed format |
| **Compliance** | — | **Sign-off on wording, fees, cutoffs. Blocks go-live** |
| **InfoSec** | — | External upload review for Power Pages |
| **Developer (me)** | Build the 8 screens and the flows | Extend to Phase 2 screens, full schema, metrics |

---

## 6. Two-week build sequence

| Day | Build | Demoable |
|---|---|---|
| **W1 Mon** | Trial Dataverse, 10 tables, synthetic seed of 28 shipments | Schema |
| **W1 Tue** | Upload screen + validation flow, Needs Attention | **Upload → cases, zero re-keying** |
| **W1 Wed** | **CHECKPOINT 1** — enrich, TIF→PDF, template selection | **End-to-end case creation** |
| **W1 Thu** | Batch board, pre-flight check, send flow, link generation | **First pre-alert sent, zero attachments** |
| **W1 Fri** | Customer link screen, upload, checklist tick | **Two-way customer flow** |
| **W2 Mon** | CONSOL merge, IGM panel, MAWB/IGM write-back | **IGM handoff works** |
| **W2 Tue** | Reminder sweeper — 15-min recurrence, 3-message cap, stop-on-reply | **Reminders fire correctly** |
| **W2 Wed** | Payment check, DO issue, case close | **Loop closes end to end** |
| **W2 Thu** | Three-path classifier, AI vs Human board, broken-case handling | **The differentiator** |
| **W2 Fri** | Timeline, demo script, dry run, buffer | **Rehearsed demo** |

**Wednesday of week 1 is the first real checkpoint.** If the approach is wrong we find out in four days, not two weeks.

---

## 7. Copy-paste prompts for Miro AI

### Prompt 1 — Phase 1 flow map

```
Create a swimlane process map for a cargo clearance system at a FedEx
gateway. Six lanes, horizontal time flow left to right.

LANES (top to bottom): IGM / SYSTEM / TRACE AGENT / CUSTOMER / BROKER-CHA

FLOW:
1. 06:00 IGM produces the UBOND Excel sheet
2. TRACE uploads the Excel to the app
3. SYSTEM validates every row, flags failures to "Needs Attention"
4. SYSTEM enriches each AWB from the ACCS API
5. SYSTEM bulk-fetches invoices for the whole batch, converts TIF to PDF
6. SYSTEM resolves clearance type: NFBRK, FEBRK-Jeena, or FEBRK-Sunimpex
7. SYSTEM picks the matching template, builds the document checklist,
   generates a secure customer link, computes the fee
8. TRACE reviews and sends the pre-alert — link only, zero attachments
9. CUSTOMER opens the link at any time, views documents, uploads what is owed
10. 08:00 IGM uploads the CONSOL sheet
11. SYSTEM merges CONSOL to UBOND cases, writes MAWB, IGM number, flight
    and arrival date back. Fuzzy matches go to an "Unsure" screen
12. 10:00 IGM enters MAWB and IGM number per AWB
13. SYSTEM sends the arrival notice, starts the reminder clock
14. CUSTOMER uploads documents and submits payment details
15. SYSTEM reads documents, ticks the checklist, auto-acknowledges
16. SYSTEM checks UTR against the bank statement every 30 minutes
17. IGM verifies payment, uploads the Delivery Order
18. SYSTEM notifies customer, notifies broker, closes the case

ANNOTATE:
- Add a diamond "Needs Attention" off steps 3, 6, 11 and 16
- Add a parallel dashed track beneath steps 15-17 showing a recurring
  15-minute reminder sweeper: Reminder 1 at T+4h, Reminder 2 at T+8h,
  call task, supervisor escalation. Hard cap 3 reminders. Clock stops
  the moment the customer responds
- Mark every SYSTEM step that is fully automatic with a small gear icon
- Mark every step needing a person with a person icon
- On the SYSTEM lane, add a bracket labelled "one Excel upload, everything
  else automatic or a human decision"

STYLE: clean, monochrome with one accent colour. No gradients. Business
process diagram, not a marketing diagram.
```

### Prompt 2 — Phase 1 screen map

```
Create a low-fidelity wireframe set for a cargo clearance web app, 8 screens.

1. BATCH UPLOAD — drag-drop Excel upload area; gateway and phase dropdowns;
   four stat tiles (loaded / ready / needs review / error); expandable table
   of problem rows each with a plain-language reason; fee tier selector
   showing ₹3,068 arrival day and ₹4,248 next day; Discard and Create buttons

2. BATCH BOARD — progress bar "26 of 28 sent"; table with columns AWB,
   Consignor, Type, Fee, State, Send status; a Blocked state shown in red;
   "Send all ready" and "Review blocked" buttons

3. NEEDS ATTENTION — list of rejected rows and blocked cases, each with
   AWB, the reason in plain language, and an action button

4. CASE DETAIL — a vertical timeline of every state change with timestamps
   as the dominant left column; documents list on the right; checklist with
   tick boxes; fee and clearance type in the header; Send button

5. IGM PANEL — MAWB number, IGM number, flight number, arrival date fields;
   a payment block with UTR and amount and a three-check history list;
   DO upload area; "Issue DO" button

6. AI vs HUMAN BOARD — two columns side by side. Left "AI handled" with one
   row per automated action showing the confidence score. Right "Needs a
   human" with one row per exception showing the reason, how long it has
   waited, and a Claim button. A footer strip stating nothing was
   auto-sent below the confidence threshold

7. CUSTOMER LINK — a single mobile-friendly page. Shipment header; a
   "documents we have" list; a "documents we need from you" checklist;
   a payment block with fee, GST breakdown, collapsible account details
   and a UTR field; upload and submit buttons

8. TIMELINE — one AWB, every event, newest at top, each with timestamp,
   actor (system or person), and description

STYLE: dense, functional, data-first. Tables and lists dominate. No hero
sections, no illustrations, no marketing copy. Think internal operations
tool, not consumer app. Purple header bar, white content, orange only for
the accent rule.
```

### Prompt 3 — Phase 2 additions and outcome

```
Extend the cargo clearance system map with what becomes possible once a
production Microsoft environment with real integrations is available.

Add a second map titled "Phase 2 — what the environment unlocks".

Left column: Phase 1 (what we have). Right column: Phase 2 (what changes).
Draw arrows between them and label each with the integration that enables it.

Integrations to show:
- ACCS write-back API      → Trace stops keying the same data twice
- Bank statement feed      → UTR matching becomes fully automatic
- Exchange send-as-agent   → real production email
- Power Pages              → public customer portal
- Full 34-table schema     → courier joins the same system
- Azure OpenAI, AI Search,
  Document Intelligence    → classification moves from rules to document
                             understanding, confidence gate gets smarter
- Managed Environment + DLP → production-grade flows and data policy

On the right side, add a descending bar showing manual work:
  Today 100%  →  Phase 1 demo 20%  →  Phase 2 production 5%
Label the final 5% explicitly as "exceptions, judgement, and Compliance
sign-off — irreducible".

Add a small annotation: "The flows do not change between phases. The
environment changes what they connect to."

STYLE: same as the first map. Emphasise the two-column before/after
comparison. This map is the argument for Phase 2 investment, so the
right column should look larger and more complete.
```

---

## 8. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Dataverse or SharePoint?** | **Dataverse.** SharePoint cannot give one customer access to only their own AWB — the customer link breaks |
| 2 | **Trial environment for Phase 1?** | **Yes.** The demo does not need the FedEx tenant, so IT delay does not block it |
| 3 | **Synthetic data only?** | **Yes.** Also lets us demo broken cases, which real data cannot |
| 4 | **IGM panel in scope?** | **Yes.** Payment verify + DO issue is the strongest moment in the demo |
| 5 | **10 tables or 34 for Phase 1?** | **10.** Strict subset, same event spine |
| 6 | **Two weeks?** | **Yes.** Checkpoint end of week 1 |
| 7 | **Frame as 100→20→5?** | **Yes.** With the reason each stage moves |

---

## 9. The ask

1. **Approve Dataverse over SharePoint**, or accept the customer link being cut
2. **Confirm a trial environment is sufficient** for Phase 1
3. **Confirm synthetic data only**
4. **Confirm the two-stage framing** and the 20% / 5% targets
5. **Confirm IGM is in Phase 1 scope** — payment verification and DO issuance

On approval, day 1 starts Monday. **Wednesday of week 1 is the first
checkpoint** — a working end-to-end case, four days in.

**Contact:** Bipul Sikder · Trace / Clearance Desk
