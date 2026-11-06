# Cargo Clearance Demo — Scope Decision

**Prepared for:** Gateway Manager
**Purpose:** decide what gets built, on what platform, in what time, to demonstrate cargo clearance to the FedEx GCC team.
**Status:** proposal for approval. Nothing built yet.

---

## 1. What I recommend, in one paragraph

Build a **cargo-only, three-screen demo on Power Apps + Power Automate**, using a **standalone Dataverse trial environment** for the data model, seeded with **synthetic AWB data only**. It covers the real cargo process end to end — Trace input, customer submission, IGM handoff, clearance tracking, DO collection — with the three-path AI decision model already proven in `cargo-paf` reimplemented in Power Automate rather than rebuilt.

**Two weeks to a defensible demo. Not a production system, and it should not pretend to be one.**

I want to be direct about one thing in §7: SharePoint is the wrong choice for this, and choosing it would cost you the demo. That is the main argument in this document.

---

## 2. What the manager is actually asking for

Two different things, and they pull in opposite directions:

| Ask | Meaning |
|---|---|
| "Small but effective" | A demo that proves the concept, in front of a real audience, on a real deadline |
| "Scalable" | Not a toy. Something a GCC developer could look at and believe this becomes a product |

The failure mode is building something that is either impressive but fragile, or robust but not demonstrable. Both kill the conversation with GCC.

**My read:** the second matters more. A GCC audience is technical. They will not be impressed by a form that looks good. They will be impressed by **a process model that is correct, an architecture that is the sanctioned one, and a working system they can reason about.** Show them the flows and the data model, not the pixels.

So: build narrow, but build it on the real platform, with the real process.

---

## 3. Proposed scope — the smallest thing that proves the concept

### In scope

| # | Capability | Why it is in |
|---|---|---|
| 1 | **Trace agent input screen** — one screen, AWB + consignee + type + freight | This is where the business value starts. Tracer types once, everything downstream is automatic |
| 2 | **Customer submission portal** — the customer submits documents against their AWB | Proves the external-facing half, which is the part nobody has built before |
| 3 | **IGM handoff panel** — MAWB/IGM status per shipment | Proves the cross-team coordination, which is the hardest part operationally |
| 4 | **Clearance tracker** — BOE filed → clearance → DO collected | Proves we understand the real process, not just the email step |
| 5 | **DO collection + payment verification** — UTR capture, fee calculation, DO release | The terminal output. Nothing else in the process matters if this does not work |
| 6 | **Three-path AI decision model** — auto-send / draft-for-human / escalate | Already proven in `cargo-paf`. This is the differentiator and it is already built |
| 7 | **Exception queue** — what needs a human, and why | Proves the system is safe to run, not just clever |
| 8 | **Full audit trail** on every action | GCC will ask. Answer it in the demo, not in a follow-up email |

### Explicitly out of scope

Stated up front so it does not become a discussion later.

| Not building | Why |
|---|---|
| Courier / MVP flow | Different process, different team. Cargo only, as agreed |
| Production data | Synthetic only. See §6 |
| 34-table Dataverse schema | Demo needs ~10 tables. See §5 |
| SharePoint document library | See §7 — the wrong tool, and it breaks the customer portal |
| Real email sending | Demo sends to a mailbox you control, or shows a preview |
| Azure AI services | The three-path model works on rules + confidence score. AI services are a production enhancement |
| IGM payment/bank feed integration | Show the UTR capture, not the bank reconciliation |
| Mobile app | Desktop browser is enough for a demo |

---

## 4. Why cargo-only is the correct decision

Not a compromise. Cargo is the harder half and the better story.

| | Courier | Cargo |
|---|---|---|
| Documents | 1–2 (RBOE) | 6+ (invoice, packing list, KYC, licence, AWB…) |
| Brokers | None — FedEx files | CHA / Jeena / Sunimpex |
| Fees | Simple | Tiered, 3 types, penalty logic |
| Cross-team | Trace → Admin | Trace → IGM → CHA → customer |
| Deadline | Hours | Same-day, 3-hour SLA |
| Volume | High, repetitive | Lower, higher complexity per case |

Cargo exercises every hard part of the system — multi-document, multi-party, deadline-driven, fee-bearing. If the demo holds for cargo, the architecture is proven for courier too. **Cargo-first is the stronger showcase precisely because it is the complex case.**

And it is the half you already know. That is a genuine advantage in a two-week build.

---

## 5. Data model — 10 tables, not 34

The full schema is 34 tables. A demo does not need 34 tables. It needs the ones the demo screens read and write.

| Table | Purpose | Demo? |
|---|---|---|
| `cd_shipment` | One row per AWB. The spine | **Yes** |
| `cd_shipment_event` | Every state change, append-only. The audit trail | **Yes** |
| `cd_document` | Documents attached, with type and status | **Yes** |
| `cd_participant` | Customer, CHA, IGM, FedEx, per shipment | **Yes** |
| `cd_task` | A unit of work, owner, due time | **Yes** |
| `cd_message` | Outbound and inbound, with the AI decision recorded | **Yes** |
| `cd_ai_decision` | Auto-send / draft / escalate, confidence, reason | **Yes** |
| `cd_document_type` | Reference list — what each shipment needs | **Yes** |
| `cd_broker` | Jeena, Sunimpex, CHA, with rules | **Yes** |
| `cd_setting` | Test mode on/off, fees, SLA hours | **Yes** |

Dropped from the 34: courier templates, 82-reason mapping, assignment pools, agent profiles, call tasks, clearance-fill, AI training data, metrics, admin config, document library versioning, templates library.

**The important point:** the 34-table design is unchanged. These 10 are a strict subset. Nothing built for the demo is thrown away, and nothing in the demo contradicts the production design. When the full schema is built later, the demo tables are the ones that already existed.

**Table count is not the measure of seriousness.** A 10-table model with a correct event spine is more defensible than 34 tables nobody has validated.

---

## 6. Test data — synthetic only

**Non-negotiable. This is the one line I will not bend.**

The `cargo-paf` database contains real AWBs, real consignee names, and real freight values. It cannot go in a GCC demo, a slide, a screenshot, or a shared environment.

So: **generate synthetic shipments.** Same column shape, same three clearance types, same fee tiers, same status sequences. Names like "Consignor Alpha Pvt Ltd", AWBs in a clearly non-real range.

The benefit is real, not just a compliance formality: **you can demo a bad case.** Synthetic data means deliberately broken rows — a missing packing list, a payment with no matching UTR, a broker not assigned, an AWB that arrived 3 days ago. Those are the cases that prove the exception handling works, and you cannot build them with real data.

**Cost:** about 2 hours of work. **Benefit:** the demo is defensible to a GCC audience and safe to share afterwards.

If a real AWB is needed for credibility, one is enough and it must be cleared with the manager first. Ask before using it.

---

## 7. On SharePoint — I recommend against it

Your manager suggested SharePoint instead of Dataverse "for now." I understand the reasoning and I think it is the wrong call. Flagging it because it is a decision that is much cheaper now than in three weeks.

The reasoning is fair: it exists, it is free, it is fast, no one needs to approve it. That is exactly why it is a trap here.

| Problem | Consequence in this demo |
|---|---|
| **No relational model** | A shipment has events, documents, tasks, participants. SharePoint has no joins. You end up denormalising into one wide list, which means the audit trail becomes manual text |
| **No per-record security** | Your customer portal needs one customer to see only their own shipments. SharePoint item-level permissions are list-level. You cannot do the core requirement |
| **Customer identity** | SharePoint cannot authenticate an external anonymous customer cleanly. The customer portal needs this |
| **Flow triggers are coarse** | "When an item is created" fires on every row, with no way to filter by shipment. You get polling and throttling — the classic SharePoint flow failure |
| **The 90-day ceiling** | List view threshold. Hit it and every screen slows down. In a demo you want a repeatable speed, not a slow one on the day |
| **Wrong architecture on show** | GCC will look at the stack. Dataverse is the sanctioned platform for this data. SharePoint for a clearance system signals the wrong instinct |

**The customer portal is the deciding factor.** That is the half of the process nobody has built, it is the part customers touch, and SharePoint cannot do per-customer isolation. Build the portal on Dataverse and it works. Build it on SharePoint and you will spend your second week fighting the platform.

**If SharePoint is non-negotiable**, then the scope changes: drop the customer portal from the demo and show only the internal Trace and IGM screens. That is a weaker demo and I would not recommend it. Worth telling the manager that is the trade, so the choice is made with open eyes.

---

## 8. Platform and environment

| Component | Choice | Rationale |
|---|---|---|
| Input layer | **Power Apps** (canvas) | The sanctioned input layer. Manager asked for it |
| Automation | **Power Automate** (cloud flows) | Same. The three-path model is flow logic |
| Data | **Dataverse, standalone trial** | Relational, per-record security, correct architecture |
| Customer portal | **Power Apps** embedded, or a simple Power Pages site | SharePoint cannot do per-customer isolation |
| Email | Demo mailbox, preview-first | No real customer contact |
| AI | Rules + confidence score, no Azure AI | Already proven in `cargo-paf`. Keeps the demo self-contained |

**On the environment:** the access request is already in front of the manager. If a tenant environment is granted, use it. If not, a **Dataverse trial environment** is enough to build and demo this — no tenant admin involvement, no data in the FedEx tenant, nothing to clean up.

That is worth being explicit about with the manager: **a trial environment is sufficient for the GCC demo.** The tenant environment is needed for production, not for the showcase. That decouples the demo from the access request, so an IT delay does not block the demo.

Trial environment limits to design within: 25 GB storage, low record-volume throttling, no production connectors. None of them bind at demo scale.

---

## 9. Two-week plan

Sequenced so there is always something demoable.

| Week | Day | Build | Demoable at end of day |
|---|---|---|---|
| 1 | Mon | Standalone Dataverse trial. 10 tables. Synthetic data seed | Nothing yet |
| 1 | Tue | Seed 30 synthetic shipments, 3 clearance types, event history | Schema visible |
| 1 | Wed | Trace input screen — AWB capture, type selection, validation | **Input layer works** |
| 1 | Thu | Event spine + status transitions wired to the input screen | **End-to-end state tracking** |
| 1 | Fri | Pre-alert generation, template selection by clearance type | **First outbound message** |
| 2 | Mon | Customer submission portal — documents against one AWB | **Two-way customer flow** |
| 2 | Tue | IGM handoff + clearance tracker screens | **Cross-team coordination** |
| 2 | Wed | DO collection, UTR capture, fee calculation | **Terminal output works** |
| 2 | Thu | Three-path AI decision model + exception queue | **The differentiator** |
| 2 | Fri | Demo script, dry run, buffer | **Rehearsed demo** |

**Wednesday of week 1 is the first thing worth showing the manager** — the input screen and state tracking. Not waiting two weeks to find out if the approach is right.

---

## 10. What to show GCC, in this order

The order matters. Lead with the process, not the interface.

| # | Show | The point being made |
|---|---|---|
| 1 | The **event spine** — every state change on one shipment, timestamped | This is a process model, not a mailer. It is the asset |
| 2 | **Trace types one AWB** → watch it propagate | The manual step that disappears |
| 3 | **Customer submits documents** against the same AWB | The external half works |
| 4 | **IGM handoff** — MAWB/IGM status visible to Trace | Cross-team visibility, no chasing |
| 5 | **Clearance → BOE filed → DO collected** | We understand the real process |
| 6 | **A deliberately broken case** → lands in the exception queue with a reason | This is the credibility moment. A system that only works on happy data is not a system |
| 7 | **The three-path AI model** — auto-send / draft / escalate, with the audit entry | Differentiation, and the human is always in the loop where it matters |
| 8 | **The table design** and how it extends to the full 34 | Scalable, and honest about what is not built yet |

**Item 6 is the one to rehearse hardest.** Everything else is a feature. Showing that a missing packing list, an unmatched UTR, and an unassigned broker each surface correctly is what makes a GCC developer believe this is not a demo that was rigged.

Say plainly what is not built. A demo that admits its boundaries gets taken seriously. A demo that overclaims gets audited, and you lose the room.

---

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| SharePoint forced as the platform | Medium | §7 makes the cost explicit — the customer portal has to go |
| Tenant access not granted in time | High | Trial environment. Demo does not depend on the tenant |
| Scope creep into production readiness | Medium | §3 out-of-scope list. Refer back to it |
| Real data appears in the demo | Low but serious | §6 is non-negotiable. Synthetic only |
| AI model looks unproven | Medium | It is already built and demoed in `cargo-paf`. Show the audit trail |
| Demo runs slow or breaks on the day | Medium | Rehearse Friday. Fallback: recorded run-through of the same data |
| "Where is the courier flow?" | Certain | Cargo-only is the agreed scope. The architecture covers courier; state that plainly |

---

## 12. Decisions needed from the manager

| # | Decision | Recommendation |
|---|---|---|
| 1 | **SharePoint or Dataverse?** | **Dataverse.** SharePoint cannot do per-customer document isolation, which the customer portal requires |
| 2 | **Demo environment** | Trial environment is sufficient. Does not need the tenant |
| 3 | **Synthetic data only?** | **Yes.** Also enables demoing broken cases |
| 4 | **10 tables or 34 for the demo?** | **10.** Strict subset of the production design |
| 5 | **Customer portal in or out?** | **In** — it is the differentiator. If forced to SharePoint, this comes out |
| 6 | **Real AWB for credibility?** | Ask first. Synthetic should be enough |
| 7 | **Is 2 weeks acceptable?** | Wednesday week 1 gives an early checkpoint if not |

---

## 13. The ask

1. **Approve Dataverse over SharePoint** — or accept the customer portal being cut (§7)
2. **Confirm a trial environment is acceptable** for the demo (§8)
3. **Confirm synthetic data only** (§6)
4. **Confirm scope** — cargo only, the 8 capabilities in §3, the exclusions in §3

Once approved, week 1 day 1 starts immediately. Wednesday of week 1 is the first checkpoint.

**Contact:** Bipul Sikder · Trace / Clearance Desk
