# 21 — What We Are Building

**One page. Read this first. If you read nothing else, read this.**
**Status:** the spine. Every other document hangs off this one.

---

## 1. The product in four sentences

Today, three FedEx teams clear import shipments using email and Excel. Every handoff is a forward, every status check is a phone call, and no two teams share a record of the same AWB.

**Clearance Desk is one case record per shipment, and one link per customer.** Mails go out from templates instead of being typed. Every reply lands back on the case automatically. The customer sees one page that always shows what is still needed.

**We are not replacing ACCS, ICEGATE, or the customs broker.** We replace the email layer between them.

---

## 2. Two products, not one

This is the single most important thing to get right, and I got it wrong for several rounds.

| | **Courier** | **Cargo** |
|---|---|---|
| Volume | 332 cases/month (Delhi pilot) | Tens of thousands, weekly |
| Who files the Bill of Entry | **FedEx's Admin team** | **The customer's CHA** |
| FedEx clearance licence | **Yes** | **No** |
| IGM / payment step | **No** | Yes |
| Who the customer is | An importer with a FedEx account | Importer or their broker |
| MAWB / IGM data used | **No** | Yes |

**Courier: FedEx files. Cargo: the CHA files.** FedEx has a licence for the first and not the second. That single fact decides the templates, the queues, and who does what.

> I once built a third courier mail shape telling customers to brief their own broker. It was wrong — no courier customer has a broker relationship with FedEx, and the data proves it: **332 of 332 rows mention a CHA zero times.** That shape was withdrawn. See doc 20 §2.

---

## 3. The cargo journey — one shipment, start to finish

**The customer is a pharma importer. Their CHA is Jeena. AWB 872150525885 lands at Delhi.**

```
06:00  ACCS ──────────────────────────────────────────────────────►
       UBOND data pulled. Broker type and contact looked up
       from a 40,000-row master.                          ┐
                                                          │
08:00  IGM ──── CONSOL sheet ────────────────────────────►│ Trace Cargo
                                                          │ (Priya)
10:00  IGM ──── MAWB / IGM sheet ────────────────────────►│
       MAWB, IGM no, flight, flight date, Pcs, weight      │
                                                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │  PRE-ALERT  (before arrival)                              │
       │  One mail, one link. Customer confirms broker choice.     │
       └──────────────────────────────────────────────────────────┘
                                                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │  ARRIVAL  (shipment lands)                                │
       │  CONSOL ↔ UBOND merged by company name (FR-11).           │
       │  Post-arrival notice: fees, documents needed, link.       │
       └──────────────────────────────────────────────────────────┘
                                                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │  FILING  — the CHA files. FedEx does not.                │
       │  CHA gets a document link once the checklist is complete. │
       │  CHA confirms "BOE filed" back into the case.             │
       └──────────────────────────────────────────────────────────┘
                                                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │  PAYMENT + DO  (this is the IGM team's job, not cargo)    │
       │  Customer pays via the link. UTR matched to the bank       │
       │  statement every 30 min (FR-12). DO issued (FR-14).        │
       └──────────────────────────────────────────────────────────┘
                                                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │  RELEASE → broker collects → customer receives.           │
       │  If DO is not collected same day, admin fee applies.       │
       └──────────────────────────────────────────────────────────┘
```

**The IGM team owns step 6 only** — payment and DO. It does not do clearance. It is a *data source* to Trace Cargo at 08:00 and 10:00, and the owner of the money queue at the end.

### What the customer actually receives

**One mail per event, one link, always current.** Not seven. Today they get up to 7 near-identical mails with hand-edited fee tables and no way to tell what is still outstanding. Every one of the 11 cargo templates collapses into that single link.

```
Event 1  Pre-alert      ──┐
Event 2  Arrival notice   │
Event 3  Reminder         ├──►  ONE LINK  ──►  what is needed, what to upload,
Event 4  Payment ask      │                    today's fee, status
Event 5  DO ready         │
Event 6  Reminder        ──┘
```

The link is the product. The mails only tell them to open it.

---

## 4. The courier journey — same spine, one fewer step

**The customer shipped 332 exception cases last month. Each needed a document from them. Every mail was typed by hand.**

```
Clearance pull sheet (332 rows, 12 categories)
              │
              ▼
   Trace Courier (Rahul)          Today: types 332 mails by hand
              │                   With us: uploads, reviews, sends a batch
              ▼
   Customer supplies document ──► reply lands on the case, auto-matched (FR-06)
              │                    AI classifies it (FR-07)
              ▼
   Clearance  →  Admin  ──►  BOE FILED BY FEDEX
              │
              ▼
   Release → delivery
```

**No broker. No CHA. No IGM. No payment step.** The customer is never asked to file anything — the mail says so explicitly:

> *"Once we have it, we file the Bill of Entry on your behalf — you do not need to do anything further with customs."*

**Two mail shapes, not eleven:**

| Shape | Ask | Categories | Rows |
|---|---|---|---|
| **A** | Supply documents to FedEx | RBOE, CI Missing, PIMS, Invoice Objection, Content, CBE14, Port Return, R&R | 8 · 314 |
| **B** | Confirm a figure | Duty, Value Clarification, MOC | 3 · 18 |

---

## 5. The one link — what it does

Every AWB gets a token-protected Power Pages URL with an expiry *(NFR-03)*.

```
┌─────────────────────────────────────────────────────┐
│  Your shipment  ·  AWB 872150525885                 │
│                                                     │
│  ● Needs from you                                    │
│     Commercial invoice          [ Upload ]          │
│     End-use statement           [ Upload ]          │
│                                                     │
│  ● From FedEx                                        │
│     Post-arrival notice         [ View ]            │
│     Delivery Order              [ View ]            │
│                                                     │
│  ● Payment                                          │
│     DO charges  ₹4,248            [ Pay ]           │
│                                                     │
│  ● Status                          Filed → Released  │
└─────────────────────────────────────────────────────┘
```

Six capabilities *(FR-05)*: status timeline · FedEx documents · customer upload boxes · broker-choice form · payment form · today's computed fee.

**The same page for the courier customer, minus broker and payment.** One portal, two configurations.

### Links, and the one that is not a link

| Who | What | Access |
|---|---|---|
| **Customer** | Their own AWB: documents, upload, payment | Token link, expiring |
| **CHA** | BOE packet for that AWB, once checklist complete | Token link, **expiring** — third party |
| **IGM team** | MAWB, IGM no, flight, weight, payment queue | **Dataverse table, no link** |

**The IGM record is deliberately not a link.** A link is a one-shot fetch against a static file. An IGM is a live record that customs amends without notice — it would be wrong within the hour, with no way to know it changed. It lives in a table with an audit trail.

The CHA link must expire. It gives a third party access to a customer's shipment data, and a permanent link is a data-exposure decision nobody should make by default *(NFR-03)*.

---

## 6. What the agent sees

The link is the customer's half. The agent's half is the reason the work shrinks.

| Screen | Job |
|---|---|
| **Batch intake** | Upload the sheet → 332 cases created, colour-coded by readiness |
| **Review queue** | AI drafts awaiting approval. Every number checked against the record |
| **My cases** | What I own, what is overdue, what needs a call |
| **Reminders** | Auto-sent at 4h / 8h / 24h, listing **only what is still missing** *(FR-10)* |
| **Pool queue** | 65 unassigned cases; a desk lead claims them |
| **Needs attention** | Every flow failure in plain language, one-click retry *(FR-17)* |
| **Supervisor** | Whose batch is stuck. Autonomy levels per situation *(FR-08)* |

**Target: 20 Trace + 6 IGM agents instead of 48 + 8** — same volume, §4. The agent stops typing and starts judging.

---

## 7. What we are not building

Stated so nobody has to guess later:

- **Not replacing ACCS** — read-only for now; write-back is Phase 2 *(§5, NFR-04)*
- **Not filing BOEs on ICEGATE** — that is the licensed CHA's job, for cargo *(§5)*
- **Not deciding duty** — we record the assessment, we do not make it
- **Not processing payments** — we match UTRs, we do not move money
- **Not a second customs broker** — FedEx has no cargo licence
- **Not 3 AI voice calls and 4 gateways** — Phase 2, deliberately *(§5)*

---

## 8. Where we are

| | |
|---|---|
| **Documents** | 21, cross-checked. This is the spine. |
| **Courier templates** | 2 shapes drafted, 11 categories configured, 82 `Reason` values mapped |
| **Cargo templates** | 11 files drafted from 10 sources — **partially revised, prose still close to source** |
| **Built** | Nothing. No environment access yet. |
| **Blocked** | Environment URL · 3 Compliance items · `MPS` piece count · brand kit |

### Blocked, with owners

| Item | Blocks | Owner | Resolve by |
|---|---|---|---|
| Environment URL + MCP allowlist | Everything | You / IT | §1 of doc 19 |
| Customs citation (B3-1) | Cargo go-live | Compliance | Wrong instrument in a penalty notice |
| Penalty day-count (B3-2) | Cargo go-live | Compliance | Delhi day 1 vs Kolkata day 2 |
| Document deadline (B3-3) | Reminder engine | Compliance | 3h / 16:30 / 14:30 / 18:00 |
| **`MPS` = pieces?** | `PIECES` on 3 cargo templates | Courier lead | **One AWB, 2 min** — see doc 20 §6 |
| Duty advancement basis | Customer billing | Commercial | 2% of invoice vs 2% of duty |
| Jeena / Sunimpex still nominated? | 2 cargo templates | Cargo lead | Unverifiable from any source |
| Brand palette + typeface | UI only | Brand | Not blocking data work |
| FR-12 90-min silence | Customer comms | You | Alert on 1st miss, or shorten |

---

## 9. Where to read next

| If you want to know | Read |
|---|---|
| Why we are building this | Doc 1 (PRD, given) |
| **What we are building** | **This document** |
| Both processes, and the licence split | Doc 20 |
| What the agent sees, all 28 flows | Doc 12 |
| Every table and column | Doc 13 |
| What to approve before sending | Doc 18 |
| What I need from you to start | Doc 19 |
| Exactly how the source mail is fixed | `templates/` |
