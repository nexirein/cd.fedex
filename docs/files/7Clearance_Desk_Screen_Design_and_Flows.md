# Clearance Desk — Screen Design & Flow Catalogue

*Screen-by-screen UI, backend logic, every Power Automate flow. Gateway-scalable: Delhi first, then Bangalore, Mumbai, Chennai — same platform, different configuration.*

---

## 0. Gateway scalability — how one platform serves every airport

The platform is **gateway-aware from day one**. Every record carries a `gateway` tag (DEL, BOM, BLR, MAA). Everything — cases, batches, teams, mailboxes, cutoffs, fees, flight schedules — is scoped to a gateway. Adding Mumbai later means adding configuration rows, not rebuilding.

```
┌─────────────────────────────────────────────────────────┐
│ CLEARANCE DESK PLATFORM                                  │
│                                                          │
│  Gateway: DEL (Delhi IGI)                                │
│   ├── Trace Cargo team (agents, mailbox, cutoffs)        │
│   ├── Trace Courier team (SD, RBOE, CD)                  │
│   ├── IGM team                                           │
│   └── Admin team                                         │
│                                                          │
│  Gateway: BOM (Mumbai) — added later, same platform      │
│   ├── Trace Cargo team (different agents, mailbox)       │
│   ├── Trace Courier team                                 │
│   ├── IGM team                                           │
│   └── Admin team                                         │
│                                                          │
│  Gateway config per airport:                             │
│   • Flight arrival times (DEL ~07:30, BOM ~06:00 etc.)   │
│   • Document cutoff (DEL 16:30 / 14:30 holidays)         │
│   • Fee rules (may differ by gateway)                    │
│   • Holidays (state-specific customs holidays)           │
│   • Team mailboxes (trace.cargo.del@, trace.cargo.bom@)  │
│   • ACCS instance / endpoint                             │
└─────────────────────────────────────────────────────────┘
```

When an agent logs in, the platform shows only their gateway's data. A supervisor with multi-gateway access can switch between them.

---

## 1. The cargo timeline — Delhi, one day

This is what the system needs to support, hour by hour:

```
05:00   ACCS: UBOND pre-alert data available (2-3 days before arrival)
        └── Trace Cargo uploads the pre-alert Excel
        └── System enriches, matches company, builds mails
        └── Agent reviews → Send all (UBOND pre-alert batch)

07:30   Flight lands at DEL
08:00   IGM team receives CONSOL data
        └── IGM uploads CONSOL Excel (AWB, company, email)
        └── System matches CONSOL ↔ UBOND (same consignee, different AWBs)
        └── IGM team passes matched data to Trace Cargo

08:30   IGM files the shipment on ICEGATE
        └── Gets MAWB number and IGM number
        └── IGM uploads the second Excel (MAWB, IGM no.)

10:00   Trace Cargo gets the MAWB/IGM sheet
        └── System merges into existing UBOND cases
        └── Generates post-arrival notice (with MAWB, IGM no., flight, charges)

~14:00  Trace Cargo sends post-arrival notices to all customers
        └── Same thread as the UBOND pre-alert
        └── Includes the UNIFIED CUSTOMER LINK (not attachments)

16:30   Document cutoff (working days) / 14:30 (customs holidays)
        └── Reminders fire for missing documents

17:00+  Fee tier changes at midnight → next-day charges apply
```

---

## 2. The unified customer link — mail is a notification, not a delivery vehicle

**Nothing is attached to the mail.** No invoice, no PDF notice, no documents. The mail is three lines and one button. Everything — every document, every status, every upload box, every form — lives behind one link per AWB.

**Why this is better than attachments:**
- No TIFF/PDF conversion hassle in the mail body
- Customer loses the mail? The link still works (it's bookmarkable)
- Documents update (post-arrival notice replaces pre-arrival) — the link always shows the latest version
- Customer uploads through the same page — no separate reply needed
- We stop sending 4–5 mails per shipment — one link, multiple short notifications pointing to it
- The unified link is reusable across cargo, courier and IGM — same page, different content per case type

Each customer gets **one link per AWB** that opens their shipment page on Power Pages.

```
https://clearance.fedex.pages.dev/s/{random-token}

Token → one AWB → shows:
├── Shipment status timeline (where things stand)
├── Documents FedEx has (invoices fetched from ACCS, arrival notice PDF)
│    └── Customer can VIEW and DOWNLOAD — not hunt through old mails
├── Documents FedEx needs from the customer
│    └── Upload boxes per missing item
├── Forms (broker choice, DO payment, details)
├── Checklist approval (code-protected)
└── Fee for today (computed live)
```

**What this replaces:**
- Attaching .tiff/.pdf invoices to every mail → customer opens the link and sees them
- Multiple mails with the same information → one link, always current
- "What documents are still missing?" calls → the page shows it live
- Customer hunting through old threads → one bookmark

**The mail still carries the key facts** (AWB, what's needed, deadline) so the customer can act from the mail itself. The link is for the full picture and for uploading.

**ACCS bulk invoice retrieval:** when a batch is sent, Power Automate calls the ACCS API to fetch invoices for all AWBs in the batch at once. Each invoice is converted from TIFF to PDF (Section 2.1) and saved to the AWB's SharePoint folder. The customer link serves them from there.

### 2.1 TIFF → PDF conversion (built into the intake flow)

When ACCS returns a `.tiff` file:

```
Power Automate F02 (ACCS enrichment)
  │
  ├── File is .tiff?
  │    ├── Option A: Word Online "Convert file" action → PDF
  │    └── Option B (if quality is poor): HTTP call to Azure Function
  │         (your existing utif/pdf-lib logic, ~50 lines, deployed once)
  │
  └── File is already .pdf? → save directly
  │
  └── PDF saved to SharePoint /AWB/{awb_number}/
       └── Served through the unified customer link
```

Test Option A first — if the quality matches your web app's output, no extra build needed.

---

## 3. Platform structure — every screen

### 3.0 Navigation

```
┌─ Clearance Desk ──────────────────────────────────── DEL ▾ ── Priya S ──┐
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🏠 Home  │ │ 📤 Send  │ │ 📥 Inbox │ │ 📋 Cases │ │ ⚙ Admin  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                          │
│  Home: my numbers, what needs me now                                     │
│  Send: new batch (cargo/courier), batch board, send queue                │
│  Inbox: AI-processed replies, drafts to approve, human review            │
│  Cases: all my cases, AWB search, case detail                            │
│  Admin: supervisor view, settings, templates, metrics, gateway config    │
└──────────────────────────────────────────────────────────────────────────┘
```

The top bar shows the agent's gateway. Supervisors see a gateway switcher.

### 3.1 Home — what needs you now

```
┌─ Home ──────────────────────────────────────────── Good morning, Priya ──┐
│                                                                          │
│  YOUR NUMBERS TODAY                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │     7      │ │     3      │ │    12      │ │     2      │            │
│  │  Drafts to │ │  Human     │ │  Ready for │ │  Errors    │            │
│  │  approve   │ │  review    │ │  ACCS      │ │            │            │
│  │  [open →]  │ │  [open →]  │ │  [open →]  │ │  [open →]  │            │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
│                                                                          │
│  TODAY'S BATCHES                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Cargo UBOND pre-alert    28 cases  ██████████░░░░  71%  sent 06:15│    │
│  │ Cargo post-arrival       28 cases  ░░░░░░░░░░░░░░   0%  ready    │    │
│  │ Courier CD pull #1       24 cases  ████████░░░░░░  50%  sent 10:12│    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  AI PERFORMANCE (last 7 days)                                            │
│  Replies handled without you: 68% · Drafts approved unchanged: 81%      │
│  ─────────────────────────────────────────────────────────────────       │
│                                                                          │
│  TIMELINE (your gateway — DEL)                                           │
│  06:15  You sent UBOND pre-alert batch (28 AWBs)                         │
│  08:02  IGM uploaded CONSOL (32 AWBs matched)                            │
│  08:45  IGM filed — MAWB/IGM numbers received                           │
│  10:10  You merged MAWB/IGM into cases — post-arrival batch ready        │
│  ● now  14:00 — send post-arrival notices                                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Send — New batch

Two modes: **Cargo** and **Courier**. The agent picks one, uploads the Excel.

**3.2a Cargo — UBOND pre-alert batch**

```
┌─ New batch · Cargo · UBOND pre-alert ───────────────────────────────────┐
│ [ Upload pre-alert Excel (.xlsx) ]   Gateway: DEL   Rows found: 28      │
│                                                                          │
│ ENRICHMENT STATUS (from ACCS + company master)                           │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ ✓ 22 Ready     — company matched, broker known, email confirmed    │   │
│ │ ⚠  4 New       — company not in master, broker/CHA form required   │   │
│ │ ✗  1 No email  — email missing in ACCS and master                  │   │
│ │ ✗  1 ACCS fail — ACCS API returned error for this AWB              │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ☑  AWB           Company              Broker    Email        Status      │
│ ☑  874515906172  A R Polymers         FEBRK-S   ar@...       Ready      │
│ ☑  382407883458  Aashita Enterprises  NFBRK     aash@...     Ready      │
│ ☑  176652290871  Silverline Traders   —         silv@...     New ⚠      │
│ ☐  194883221056  Meridian Textiles    FEBRK-J   —            No email ✗ │
│ ☐  220981735642  Vantage Imports      NFBRK     —            ACCS fail ✗│
│                                                                          │
│ PREVIEW (click any row to see the mail)                                  │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ To: ar@arpolymers.com                                              │   │
│ │ Subject: AWB 874515906172 | Pre-arrival notice | A R Polymers      │   │
│ │                                                                    │   │
│ │ Dear Sir/Madam,                                                    │   │
│ │ Your shipment AWB 874515906172 (5 pcs, 22 kg, USD 3,200) is       │   │
│ │ arriving at Delhi on 25 Sep. Clearance: FedEx CHA (Sunimpex).      │   │
│ │                                                                    │   │
│ │ Track your shipment and upload documents:                          │   │
│ │ [ View shipment details → ]  ← unified link                       │   │
│ │                                                                    │   │
│ │ Documents needed before 16:30 on arrival day:                      │   │
│ │ • KYC + authority letter  • Invoice & packing list ...             │   │
│ │                                                                    │   │
│ │ Charges: Rs 3,068 on arrival day / Rs 4,248 from next day          │   │
│ │                                                                    │   │
│ │ ✓ Arrival Notice PDF attached                                      │   │
│ │ ✓ Invoice PDF attached (fetched from ACCS, converted from TIFF)    │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ 22 ready · 4 new (will get broker form) · 2 need fixing                  │
│ [ Send 26 now ]  [ Fix red rows ]  [ Save draft ]                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**3.2b Cargo — Post-arrival batch (after IGM files)**

```
┌─ New batch · Cargo · Post-arrival (MAWB/IGM merge) ────────────────────┐
│ [ Upload IGM sheet (.xlsx) ]   Gateway: DEL   Rows found: 28            │
│                                                                          │
│ MERGE STATUS (matching to existing UBOND cases)                          │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ ✓ 26 Matched   — CONSOL AWB linked to UBOND case, MAWB/IGM added  │   │
│ │ ⚠  2 Unsure    — company name differs slightly, confirm match      │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ☑  UBOND AWB     CONSOL AWB     MAWB              IGM       Match       │
│ ☑  874515906172  887341002956   023 02961092       3088962   Exact ✓     │
│ ☑  382407883458  887341003012   023 02961092       3088962   Exact ✓     │
│ ☐  176652290871  887341003089   023 02872376       3090888   Name? ⚠     │
│    UBOND: "Silverline Traders"  CONSOL: "Silver Line Traders Pvt Ltd"    │
│    [ Confirm match ]  [ Not the same ]                                   │
│                                                                          │
│ PREVIEW: post-arrival notice in the SAME THREAD as the pre-alert        │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ Subject: Re: AWB 874515906172 | Arrived — action required | ...    │   │
│ │                                                                    │   │
│ │ Your shipment has arrived at Delhi (DEL).                          │   │
│ │ MAWB: 023 02961092 · IGM: 3088962 · Flight: FX5279T · 25 Sep      │   │
│ │                                                                    │   │
│ │ Track and upload documents: [ View shipment → ]                    │   │
│ │                                                                    │   │
│ │ DO charges today: Rs 3,068 (from tomorrow: Rs 4,248)               │   │
│ │ Documents still needed: KYC, authority letter                      │   │
│ │                                                                    │   │
│ │ ✓ Updated Arrival Notice PDF attached (now with MAWB/IGM)          │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ 26 ready · 2 need confirmation                                           │
│ [ Send 26 post-arrival notices ]                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

**3.2c Courier — exception batch**

```
┌─ New batch · Courier · Exception pull ──────────────────────────────────┐
│ [ Upload Clearance pull (.xlsx) ]   Sub-team: [CD ▾]   Rows: 24        │
│                                                                          │
│ ☑  AWB           Company              Category          Email    Status  │
│ ☑  176652290871  Silverline Traders   Value clarif.     ✓        Ready  │
│ ☑  208774410932  Orbit Components     Missing CI        ✓        Ready  │
│ ☑  220981735642  Vantage Imports      Duty / ROD        ✓        Ready  │
│ ☐  194883221056  Meridian Textiles    Invoice obj.      ✗        Fix    │
│                                                                          │
│ PREVIEW: category template + ACCS data + AI-rewritten remarks           │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ Subject: AWB 176652290871 | Value clarification | Silverline ...   │   │
│ │                                                                    │   │
│ │ The invoice value is USD 1,200 while the AWB shows USD 1,850.      │   │
│ │ Customs needs this corrected before clearance can proceed.         │   │
│ │                                                                    │   │
│ │ Please provide:                                                    │   │
│ │ • Correct value and currency                                       │   │
│ │ • Reason for the difference                                        │   │
│ │ • Corrected invoice                                                │   │
│ │                                                                    │   │
│ │ [ Submit details and upload documents → ]  ← unified link          │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ 23 ready · 1 need fixing                                                 │
│ [ Send 23 now ]  [ Edit template ]  [ Save draft ]                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Batch board

```
┌─ Batches ────────────────────────── Filter: [Mine ▾] [Today ▾] [Type ▾] ┐
│                                                                          │
│ BATCH              TYPE              SENT     PROGRESS              AGE  │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ CG-B-0925-01     Cargo UBOND       06:15    ██████████░░░░  71%   3h  │
│ │ 28 cases · 20 responded · 14 complete · 6 partial · 8 no reply        │
│ │ [ View ] [ Remind 8 no-reply ] [ Export ]                              │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ CG-B-0925-02     Cargo post-arrival —       ░░░░░░░░░░░░░░   0%  new  │
│ │ 28 cases · ready to send (post-arrival notices with MAWB/IGM)         │
│ │ [ Send now ] [ Preview ]                                               │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ CD-B-0925-01     Courier CD         10:12   ████████░░░░░░  50%   1h  │
│ │ 24 cases · 12 responded · 8 complete · 4 partial · 12 no reply        │
│ │ [ View ] [ Remind 12 ] [ Export ]                                      │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ BULK:  Select batches → [ Remind all no-reply ]                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Inbox — the AI-processed reply stream

This replaces Outlook entirely for customer mail. The agent never opens Outlook to read replies.

```
┌─ Inbox ──────────────────── Filter: [Me ▾] [Drafts 7] [Review 3] [All] ┐
│                                                                          │
│ DRAFTS TO APPROVE (AI wrote a reply, needs your click)                   │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ 🟡 AWB 176652290871 · Silverline Traders · Value clarif.     2h ago│   │
│ │    Customer: "Revised invoice attached. Will duty change?"         │   │
│ │    AI draft: "Thank you for the corrected invoice. Customs will..." │   │
│ │    Items satisfied: corrected invoice ✓ (conf. 0.93)               │   │
│ │    [ Approve & send ]  [ Edit ]  [ Reject ]  [ Open case ]        │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ 🟡 AWB 382407883458 · Aashita Ent. · Pre-alert docs         1h ago│   │
│ │    Customer: "KYC and auth letter attached"                        │   │
│ │    AI draft: "Documents received — we'll proceed with clearance."  │   │
│ │    Items satisfied: KYC ✓ authority letter ✓ (conf. 0.91)          │   │
│ │    [ Approve & send ]  [ Edit ]  [ Reject ]  [ Open case ]        │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ HUMAN REVIEW (AI couldn't handle — you need to read and respond)         │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ 🔴 AWB 220981735642 · Vantage Imports · Duty/ROD            40m ago│   │
│ │    Reason: RISK FLAG — duty dispute + angry sentiment               │   │
│ │    Customer: "This duty is completely wrong. I refuse to pay..."    │   │
│ │    No draft generated.                                             │   │
│ │    [ Open case ]  [ Write reply ]  [ Escalate ]                    │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ 🔴 No AWB found                                              20m ago│   │
│ │    From: unknown.person@gmail.com                                  │   │
│ │    Subject: "Need update on my shipment urgently"                  │   │
│ │    [ Match to AWB ]  [ Reply from here ]  [ Ignore ]               │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ AI HANDLED (no action needed — review anytime)                           │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ ✅ AWB 208774410932 · Orbit Comp. · Missing CI · portal upload     │   │
│ │    Invoice + packing list received via portal · items ticked        │   │
│ │ ✅ AWB 231778450019 · Nova Pharma · out-of-office logged           │   │
│ │ ✅ AWB 245109987762 · "Thank you" reply logged                     │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 Case detail

```
┌─ AWB 874515906172 ────────────────────────── case CG-000118 ── DEL ─────┐
│ A R Polymers Pvt Ltd · FEBRK — Sunimpex · Value: USD 3,200              │
│ UBOND AWB: 874515906172 · CONSOL AWB: 887341002956                      │
│ MAWB: 023 02961092 · IGM: 3088962 · Flight: FX5279T · 25 Sep 07:32     │
│                                                                          │
│ STATUS: Waiting on customer — 2 items missing     Due: 16:30 today      │
│ Owner: Priya S · Batch: CG-B-0925-01 · CHA: Sunimpex (notified 10:15)  │
│                                                                          │
├─ TIMELINE ────────────────────────┬─ REQUIRED ITEMS ─────────────────────┤
│ 06:15 ⟶ UBOND pre-alert sent     │ ✅ KYC                    received   │
│          (unified link created)  │ ✅ Authority letter        received   │
│ 07:45 ⟵ OOO auto-reply (logged) │ ✅ Invoice & packing list  accepted   │
│ 08:45    CONSOL matched (system) │    └── Value: USD 3,200 ✓ matches    │
│ 10:10    MAWB/IGM merged         │ ○  GATT/import decl. ×2   missing    │
│ 14:02 ⟶ Post-arrival sent        │ ○  Technical write-up     missing    │
│          (MAWB/IGM + charges)    │ ✅ AD code                 received   │
│ 14:30 ⟵ Customer: "write-up     │ ✅ IEC                     received   │
│          attached, GATT will     │ ✅ GST cert                received   │
│          follow by end of day"   │ ✅ Broker confirmed        FEBRK-S    │
│ 14:30    AI: partial response    │                                       │
│          draft ready (1 item)    │ DOCUMENTS (SharePoint)                │
│ 14:32 ⟶ Draft approved & sent:  │ 📎 Invoice_874515906172.pdf (ACCS)    │
│          "Write-up received.     │ 📎 KYC_ARPolymers.pdf (portal)        │
│          Still needed: GATT"     │ 📎 AuthLetter.pdf (portal)            │
│                                  │ 📎 TechnicalWriteup.pdf (email)       │
│ PAYMENT                          │ 📎 ArrivalNotice_v2.pdf (generated)   │
│ Status: not yet submitted        │                                       │
│ Due: Rs 3,068 (arrival day)      │ CUSTOMER LINK                        │
│ Tomorrow: Rs 4,248               │ https://clearance.../s/a8f2k... [copy]│
├──────────────────────────────────┴───────────────────────────────────────┤
│ ACTIONS                                                                  │
│ [ Reply to customer ]  [ Internal note ]  [ Send reminder ]              │
│ [ Mark ACCS updated → Admin ]  [ Reassign ]  [ Escalate ]               │
│ [ Notify CHA ]  [ Request checklist approval ]                           │
│ [ Open customer link ↗ ]  [ Open in Outlook ↗ ]                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 IGM — Payments

```
┌─ Payments · IGM ───────────────── DEL ── Filter: [Today ▾] [Status ▾] ──┐
│ [Matched 34]  [Needs review 5]  [Waiting 9]  [Ready for DO 21]          │
│                                                                          │
│ NEEDS REVIEW                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ AWB 382407883458 · Aashita Ent.                                    │   │
│ │ Submitted: Rs 1,500 via portal · UTR: N7781042 · GST: 07AA...      │   │
│ │ Due: Rs 3,068                                                      │   │
│ │ Result: SHORT — balance Rs 1,568                                   │   │
│ │ AI draft: "We received Rs 1,500. Balance of Rs 1,568 is due..."    │   │
│ │ Auth letter: ✓  DO request: ✓  GST: ✓                              │   │
│ │ [ Approve draft & send ]  [ Edit ]  [ Confirm as full ]            │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ AWB 190455621873 · Nova Pharma                                     │   │
│ │ Submitted via deldo@ (screenshot parsed by AI)                     │   │
│ │ UTR: — (AI could not read) · Amount: Rs 4,248                      │   │
│ │ Result: UTR NOT FOUND — bank has no matching record                │   │
│ │ [ Ask customer for bank advice (draft) ]  [ Enter UTR manually ]   │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ READY FOR DO                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ ☑ AWB 874515906172  A R Polymers    Rs 3,068  matched  all docs ✓  │   │
│ │ ☑ AWB 208774410932  Orbit Comp.     Rs 3,068  matched  all docs ✓  │   │
│ │ [ Process in ACCS → upload DO → DO issued ]                        │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.7 Ready for ACCS

```
┌─ Ready for ACCS ────────────────────── Filter: [Me ▾] [Type ▾] ─────────┐
│ Cases where all items are accepted — update ACCS from this structured    │
│ view, then hand off to Admin for BOE filing.                             │
│                                                                          │
│ ☑ AWB 208774410932 · Orbit Components · Missing CI · complete 12:05     │
│   Invoice: USD 482, 2 pcs, 1.2 kg · Packing list: ✓ · [View docs]      │
│   [ Mark ACCS updated → send to Admin ]                                  │
│                                                                          │
│ ☑ AWB 176652290871 · Silverline Traders · Value clarif. · complete 15:30│
│   Corrected value: USD 1,850 CIF · Invoice rev: ✓ · [View docs]        │
│   [ Mark ACCS updated → send to Admin ]                                  │
│                                                                          │
│ BULK: [ Mark selected → Admin ]                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.8 Admin handoff (Admin team view)

```
┌─ Admin handoff ─────────────────── DEL ── Filter: [Ready ▾] [Agent ▾] ──┐
│ Cases received from Trace, ready for BOE filing.                         │
│                                                                          │
│ AWB 208774410932 · Orbit Components · from: Priya S · arrived 14:02     │
│ All docs in SharePoint: invoice, PL, KYC, auth letter, IEC, GST         │
│ ACCS updated: ✓ by Priya S at 15:35                                     │
│ CHA: Sunimpex — notified, checklist approved                             │
│ [ View docs ]  [ Mark BOE filed ]  [ Send back to agent — reason ▾ ]    │
│                                                                          │
│ AWB 176652290871 · Silverline Traders · from: Priya S · arrived 14:02   │
│ All docs: ✓   ACCS: ✓   CHA: NFBRK (ABC Logistics) — notified           │
│ [ View docs ]  [ Mark BOE filed ]  [ Send back — reason ▾ ]             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.9 Needs attention (errors)

```
┌─ Needs attention ────────────────────────────────────────────────────────┐
│ Everything that failed, with plain reasons and one-click fixes.          │
│                                                                          │
│ 🔴 AWB 194883221056 · Meridian Textiles                                 │
│    ACCS API returned "AWB not found" at 06:12                            │
│    [ Retry ACCS lookup ]  [ Enter email manually ]  [ Skip ]            │
│                                                                          │
│ 🔴 AWB 220981735642 · Vantage Imports                                   │
│    Mail bounced: priya.vantage@gmail.com — invalid address               │
│    [ Update email ]  [ Mark no-email ]                                   │
│                                                                          │
│ 🟡 AWB 245109987762 · mail sent but conversation ID not captured         │
│    Reason: Outlook API timeout during send                               │
│    Mail was sent (check Sent Items). Replies may not auto-match.         │
│    [ Retry capture ]  [ Link manually by subject search ]                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.10 Supervisor

```
┌─ Supervisor · Courier CD ───────────────── DEL ── [Switch to Cargo ▾] ──┐
│                                                                          │
│ TEAM OVERVIEW (today)                                                    │
│ Agent       Batches  Cases  Responded  Drafts pending  Oldest   AI %     │
│ Priya S        2       52      44%          7            2h      71%     │
│ Rahul M        3       71      58%          2            40m     76%     │
│ Anjali K       2       49      31%         14 ▲          5h ▲    63%     │
│ Deepa R        1       28      75%          1            20m     82%     │
│                                                                          │
│ [ Reassign Anjali's 14 pending drafts → Deepa R ]                        │
│                                                                          │
│ AI AUTONOMY SETTINGS                                                     │
│ Level 1 (auto-send) ON for:                                              │
│   ✓ "Documents received — thank you"                                     │
│   ✓ "Still missing: {items}" reminders                                   │
│   ✗ "Payment received" — 89% approval (need 95%)                        │
│                                                                          │
│ Candidate for Level 1:                                                   │
│   "Corrected invoice received" — 97% approved unedited (214 cases)      │
│   [ Switch on ]                                                          │
│                                                                          │
│ GATEWAY CONFIG (DEL)                                                     │
│ Flight arrival: 07:30 · Doc cutoff: 16:30 / 14:30 holidays              │
│ DO fee: Rs 3,068 arrival / Rs 4,248 next day                             │
│ [ Edit gateway settings ]                                                │
│                                                                          │
│ METRICS (last 30 days)                                                   │
│ Avg time pull upload → all mails sent: 8 min (was: 3.5 hours)           │
│ First-response completeness: 62% (target: 80%)                          │
│ Same-day DO rate: 74% (was: 58%)                                         │
│ Auto-matched payments: 87%                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.11 Settings (templates, rules, items)

```
┌─ Settings ───────────────────────────────────────────────────────────────┐
│                                                                          │
│ TEMPLATES                                                                │
│ ┌──────────────────────────────────────────────────────────────────┐     │
│ │ Cargo UBOND pre-alert (FEBRK)     [Edit]  [Preview]  [History]  │     │
│ │ Cargo UBOND pre-alert (NFBRK)     [Edit]  [Preview]  [History]  │     │
│ │ Cargo post-arrival                [Edit]  [Preview]  [History]  │     │
│ │ Cargo new customer                [Edit]  [Preview]  [History]  │     │
│ │ Courier — Value clarification     [Edit]  [Preview]  [History]  │     │
│ │ Courier — Missing CI              [Edit]  [Preview]  [History]  │     │
│ │ ...11 courier category templates (12 Master values, 1 merged)...│     │
│ │ IGM — DO payment request          [Edit]  [Preview]  [History]  │     │
│ │ IGM — Payment received            [Edit]  [Preview]  [History]  │     │
│ │ IGM — Balance due                 [Edit]  [Preview]  [History]  │     │
│ │ [ + New template ]                                               │     │
│ └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│ REQUIRED ITEMS PER CASE TYPE                                             │
│ ┌──────────────────────────────────────────────────────────────────┐     │
│ │ Cargo pre-alert    14 items: KYC, auth letter, invoice/PL...    │     │
│ │ Courier — Missing CI    2 items: invoice (doc), packing list    │     │
│ │ Courier — Value clarif. 3 items: value (field), reason, invoice │     │
│ │ IGM — DO payment    5 items: UTR, amount, GST, auth letter...   │     │
│ │ [ Edit ] per case type                                          │     │
│ └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│ GATEWAY: DEL                                                             │
│ Fees · Cutoffs · Holidays · Flight schedule · ACCS endpoint · Mailboxes │
│ [ Edit gateway config ]                                                  │
│                                                                          │
│ COMPANY MASTER                                                           │
│ 41,287 companies · last imported: 22 Sep · 312 auto-corrected this month │
│ [ Search ] [ Import new Excel ] [ Export ]                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Customer portal — Power Pages

### 4.1 Unified shipment page (the link the customer receives)

```
┌─ FedEx · Your shipment ─────────────────────────────────────────────────┐
│ AWB 874515906172 · A R Polymers Pvt Ltd                                 │
│                                                                          │
│ STATUS                                                                   │
│ ●───────●───────●───────○───────○                                        │
│ Pre-alert  Arrived   Docs    Payment  DO issued                          │
│ 23 Sep     25 Sep    partial  pending                                    │
│                                                                          │
│ SHIPMENT DETAILS                                                         │
│ MAWB: 023 02961092 · IGM: 3088962 · Flight: FX5279T · 25 Sep 07:32     │
│ Pieces: 5 · Weight: 22 kg · Value: USD 3,200 · Origin: HKG              │
│ Clearance: FedEx CHA (Sunimpex)  [ Change broker / CHA ]                │
│                                                                          │
│ YOUR DOCUMENTS FROM FEDEX                                                │
│ 📎 Invoice_874515906172.pdf          [ Download ]                        │
│ 📎 Cargo_Arrival_Notice_v2.pdf       [ Download ]                        │
│                                                                          │
│ DOCUMENTS WE NEED FROM YOU                 Due: 16:30 today              │
│ ✅ KYC                                     uploaded 25 Sep 09:12         │
│ ✅ Authority letter                        uploaded 25 Sep 09:12         │
│ ✅ Invoice & packing list                  accepted                      │
│ ○  GATT / import declaration ×2           [ Upload ]                     │
│ ○  Technical write-up                     [ Upload ]                     │
│ ✅ AD code                                 provided                      │
│ ✅ IEC                                     provided                      │
│ ✅ GST certificate                         provided                      │
│                                                                          │
│ CHARGES                                                                  │
│ Today (arrival day): Rs 2,600 + 18% GST = Rs 3,068                      │
│ From tomorrow: Rs 2,600 + Rs 1,000 admin + 18% GST = Rs 4,248           │
│                                                                          │
│ [ Submit DO payment → ]  (opens the payment form)                        │
│                                                                          │
│ Questions? Reply to any email from FedEx Clearance Desk.                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 DO payment page

```
┌─ FedEx · DO Payment ── AWB 874515906172 ────────────────────────────────┐
│ Amount due today: Rs 3,068                                               │
│                                                                          │
│ Bank details for NEFT:                                                   │
│ Bank of America · A/C: XXXXXXXXXXXX · IFSC: BOFAXXXXXXX                 │
│                                                                          │
│ UTR number          [                    ]                                │
│ Amount paid (Rs)    [                    ]                                │
│ Payment date        [        /   /       ]                               │
│ Remitter name       [ A R Polymers Pvt Ltd         ]  (pre-filled)      │
│ Consignee GSTIN     [ 07AAXXXXXXXXX1Z5             ]  (pre-filled)      │
│                                                                          │
│ Collection by:                                                           │
│ (●) FedEx delivery (FEBRK)                                               │
│ ( ) My own CHA (NFBRK)                                                  │
│                                                                          │
│ Authority letter    [ Choose file ]  AuthLetter.pdf ✓                    │
│ DO request letter   [ Choose file ]  DORequest.pdf ✓                     │
│                                                                          │
│                         [ Submit payment details ]                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4b. The reminder and follow-up engine — fully automatic

No agent is involved in any reminder. The engine (Power Automate flow F17) runs every 15 minutes, checks every open case against its deadline, and sends the right follow-up at the right time.

**What each reminder says:** only the items still missing. Not everything again. And every reminder points to the same unified link — the customer clicks it, sees what's needed, uploads it right there.

**Reminder timeline (configurable per gateway):**

| When | What fires | Who sees it | Example mail |
|---|---|---|---|
| T + 0 | Request sent (pre-alert, courier request, DO payment ask) | Customer | "Your shipment AWB… [View →]" |
| T + 4h (configurable) | **Reminder 1** — gentle | Customer | "2 items still needed for AWB…: GATT declaration, technical write-up. [View →]" |
| T + 8h or 2h before cutoff (whichever is first) | **Reminder 2** — deadline | Customer + optional Gupshup SMS/WhatsApp | "Due by 16:30 today. Missing: GATT declaration. [View →]" |
| T + 24h or no response after R2 | **Escalation** — agent alerted | Agent's review queue | "No response from A R Polymers on AWB…" + for cargo new customers: call task created |
| Midnight | **Fee change** — if DO not paid | Customer | "DO charges have changed to Rs 4,248." Updated on the unified link automatically |
| 2nd Saturday / customs holiday | **Holiday hold** — no reminders | Nobody | Reminders paused; deadlines adjusted; fee tier frozen |

**Gupshup integration (optional, for Reminder 2 only):**
- If the company has opted in (`whatsapp_optin = true` in the company master)
- Power Automate calls the Gupshup API over HTTP with: phone number, a short message, and the unified link
- Example: *"FedEx: 2 documents still needed for AWB 874515906172. Due 16:30 today. View: [link]"*
- This is a nudge only — the conversation and the record stay in the platform

**Follow-up after partial response:**
When a customer submits some items but not all, the system doesn't send a fresh reminder from the start. It sends a **follow-up** that acknowledges what was received and lists only what's still missing:

> "Thank you — we received the corrected invoice and KYC for AWB 874515906172. Still needed: authority letter, GATT declaration. [View →]"

This follow-up is either auto-sent (Level 1, once proven) or drafted for agent approval (Level 2, at pilot).

---

## 4c. Why not split pre-arrival and post-arrival agents

For the last three years, due to short manpower, cargo agents have handled both pre-arrival and post-arrival together. Now there's manpower to split them. But the real goal is to **reduce** the number of agents needed, not add more.

**With this system, the split is unnecessary because:**

| Stage | Today (agent does it) | With the system (engine does it) |
|---|---|---|
| UBOND pre-alert | Agent sends each one from the Excel template | Engine sends automatically for all known customers. Agent touches only new/unmatched companies. |
| CONSOL merge | Agent manually cross-references | Engine matches CONSOL ↔ UBOND automatically; agent confirms only fuzzy matches |
| Post-arrival notice | Agent sends each one with hand-edited MAWB/IGM/fee | Engine sends automatically when IGM data merges in — same thread as the pre-alert |
| Reminders | Agent remembers, or doesn't | Engine sends at timed intervals |
| Follow-ups | Agent reads reply, writes back | AI drafts; agent approves or the engine auto-sends for proven situations |

**One agent owns a batch of AWBs end to end** — pre-alert through to Admin handoff. The engine handles both stages of sending. The agent's job is reviewing exceptions, approving drafts, and updating ACCS. That's 15–20 people doing the work that 48 do today.

---

## 5. Power Automate — complete flow catalogue (20 flows)

### 5.1 Intake and enrichment

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F01** | Batch intake | App: Excel uploaded to New batch | Reads rows, validates, creates Batch + Case rows per AWB, calls F02 + F03 per row | Handles cargo pre-alert, cargo post-arrival (merge), and courier pull |
| **F02** | ACCS enrichment | Child (called by F01) | Fetches AWB details (email, value, pieces, weight, origin, contents) from ACCS API; fetches invoice files (bulk); converts TIFF → PDF; saves to SharePoint AWB folder | TIFF conversion built in |
| **F03** | Build request | Child (called by F01) | Picks template by case type + category; creates required items from config; generates the secure portal link (token + expiry) | One child, all case types |
| **F04** | CONSOL ↔ UBOND match | Triggered when IGM uploads CONSOL sheet | Matches CONSOL AWBs to existing UBOND cases by company name (exact → auto, fuzzy → confirm screen); merges MAWB and IGM number into the case | The 08:00 step |

### 5.2 Sending

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F05** | Send engine | App: Send all / Send / Approve & send / Remind | Sends each mail using the agent's Outlook connection; sets Reply-To to the team mailbox; attaches Arrival Notice PDF and invoice PDF; paces at 20/min; logs message ID + conversation ID | One flow, all case types |
| **F06** | Arrival Notice PDF | Child (called by F01 for cargo, F04 for post-arrival) | Populates the Word template with MAWB, IGM, flight, AWB, charges → converts to PDF → saves to AWB folder | Pre-alert version and post-arrival version (with MAWB/IGM) |

### 5.3 Reply processing (the AI engine)

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F07** | Reply intake | New mail in each team mailbox (×3 flows: courier, cargo, deldo@) | Pre-filter (OOO, bounce, internal) → match by conversation ID / case ref / AWB / sender → save attachments → call F08 | Three triggers, same logic |
| **F08** | AI read + classify | Child (called by F07, F12) | Document Intelligence on attachments → Azure OpenAI extraction + classification (JSON) → RAG retrieval (Azure AI Search) → returns: intent, items satisfied, values, confidence, flags | The classifier |
| **F09** | Decide + act | Child (called by F08) | Applies autonomy policy: Level 0 (auto-handle), Level 1 (auto-send template), Level 2 (draft for approval), Level 3 (human review) → tick items, write draft, update case | Number check on every draft |

### 5.4 Portal and external

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F10** | Portal intake | Power Pages form submitted | Validates token → saves fields + files → ticks required items → confirmation mail → calls F08 for document validation | Customer and CHA uploads |
| **F11** | Checklist approval | App: request approval / scheduled status check | Gets the approval link (site API, PA Desktop, or agent pastes) → creates code-protected portal page → sends to consignee → syncs approve/decline from ACCS | The RBOE / HV flow |
| **F12** | UTR matching | Every 30 min + new bank statement file | Compares pending payments with bank lines: exact UTR + amount → matched; small diff / split → needs review with reason; not found after 3 checks → alert | IGM core flow |

### 5.5 Handoff and status

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F13** | DO issued | App: IGM uploads DO PDF and clicks "DO issued" | Sends DO + invoice in the customer's existing thread; updates unified link status to "DO issued"; closes the case | IGM final step |
| **F14** | CHA notify | Case items complete / broker confirmed | Sends CHA the case reference + document links; opens a CHA sub-case if action needed | FEBRK and NFBRK |
| **F15** | Admin handoff | App: agent clicks "ACCS updated → Admin" | Moves the case to Admin view; notifies the Admin duty person | Trace → Admin |
| **F16** | ICEGATE broadcast | App: IGM clicks "ICEGATE delayed" for a flight/date | Adds a status note to every affected case; updates every affected customer's thread and unified link | One-click for many cases |

### 5.6 Operations

| # | Flow | Trigger | What it does | Notes |
|---|---|---|---|---|
| **F17** | Reminder sweeper | Every 15 min | Finds cases past due: reminder 1 (template) → reminder 2 (urgent) → call task (cargo new customers) → escalate (supervisor @mention); respects cutoffs, holidays, fee tier change at midnight | The timer |
| **F18** | Learning loop | Nightly | Pushes approved/edited/rejected drafts + their outcomes into Azure AI Search; computes approval rates per situation for the Supervisor screen | How the AI improves |
| **F19** | Error logger | Child (called from every flow's Catch block) | Writes a plain-language error row to Dataverse; appears in Needs attention screen with retry payload | Every flow has Try/Catch → F19 |
| **F20** | Portal link manager | Scheduled daily | Expires old tokens; revokes tokens for closed cases; cleans up | Housekeeping |

### 5.7 Summary

**20 flows total: 13 main flows + 7 child/reusable flows.**

3 reply triggers (one per team mailbox) handle all 56 agents. Adding a new gateway = 3 more triggers (same logic, new mailboxes) + gateway config rows.

---

## 6. What's needed outside Microsoft

| Item | Owner | Required for | If not available |
|---|---|---|---|
| ACCS API (read AWB details + invoice files; write status ideally) | FedEx IT | F02 enrichment, TIFF→PDF, invoice on the unified link | Scheduled ACCS export file |
| ACCS checklist approval site API | Site owner | F11 — auto-generate and track the approval link | PA Desktop robot, or agent pastes the link |
| Bank of America statement/feed | Finance | F12 UTR matching | IGM confirms manually from the queue |
| Azure OpenAI | Azure admin | F08–F09 AI engine | AI Builder (less capable, higher per-call cost) |
| Azure AI Search | Azure admin | RAG knowledge base | No RAG; AI uses templates only |
| Azure AI Document Intelligence | Azure admin | Reading invoices and payment screenshots | AI Builder prebuilt models |
| Gupshup (optional) | Existing collaboration | SMS/WhatsApp reminder with the unified link | Email reminders only |

---

## 7. Build order — 10 weeks

| Week | Build | Done when |
|---|---|---|
| 1 | Approvals, workshops, template writing, 100 masked past replies per team, company master export | Checklists, templates and categories signed off |
| 2 | Dataverse tables, config data, company import, gateway config (DEL), test mode, service account, F19 errors | Test AWBs and companies visible |
| 3 | F01–F03 + F06 for **cargo UBOND**: batch intake, ACCS enrichment (with TIFF→PDF), build request, Arrival Notice PDF; Send screen (3.2a) | 28-row pre-alert produces correct previews and PDFs |
| 4 | F04 CONSOL↔UBOND match; post-arrival merge screen (3.2b); F05 send engine (test mode); Batch board (3.3) | UBOND + CONSOL merge correctly; test-mode send works |
| 5 | F07–F09 reply engine (rules + AI); Azure AI Search index; Inbox screen (3.4); Case detail (3.5) | 100 test replies: AWB match ≥ 98%, intent correct ≥ 90% |
| 6 | Power Pages: unified shipment page (4.1) + DO payment page (4.2); F10 portal intake; F20 link manager | Portal uploads tick items; customer sees docs and status |
| 7 | **Courier** config: pull intake, 11 category templates, courier send screen (3.2c); F11 checklist approval; Ready for ACCS (3.7); Admin handoff (3.8) | 332 real pull rows produce correct requests; 65 pool rows blocked until assigned |
| 8 | **IGM**: F12 UTR matching, F13 DO issued, F16 ICEGATE broadcast; Payments screen (3.6) | Test payments give correct results; DO reaches customer |
| 9 | F17 reminders, F18 learning loop, Supervisor screen (3.10), Settings screen (3.11), F14 CHA notify, F15 Admin handoff flow; parallel run (test mode, real data) | One week, no wrong mail, every error explained |
| 10 | Pilot: one courier sub-team + one cargo group + IGM on real customers (allowlist); daily review; measure | Pilot numbers recorded |

---

## 8. Key design decisions — quick reference

| Question | Answer |
|---|---|
| Cargo or courier — separate platforms? | One platform, one engine, case types as configuration |
| Who sends the mail? | The agent's own Outlook, with Reply-To set to the team mailbox |
| Where do replies go? | One team mailbox per case type (3 mailboxes serve all 56 agents) |
| Does the customer get attachments? | No — they get a unified link where all documents (including ACCS invoices converted from TIFF) are viewable and downloadable |
| How does the AI handle replies? | Level 0–3 autonomy: from silent item-ticking to human-only, earned per situation |
| How do we scale to Mumbai? | New gateway config rows, new mailboxes, same flows |
| How does TIFF→PDF work? | Built into F02 (ACCS enrichment); Word Online convert or Azure Function |
| Where does the customer upload? | Power Pages (token-protected page per AWB); also by reply mail |
| How does the agent avoid Outlook? | Inbox screen (3.4) shows every reply; Approve & send is one click; "Open in Outlook" exists for edge cases |
| What's the single biggest dependency? | ACCS API access — decides how much auto-filling and invoice retrieval is possible |
