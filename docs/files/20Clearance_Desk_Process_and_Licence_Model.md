# 20 — Process Model: Cargo, IGM and the Licence Split

**Source:** PRD v1.0 (`1Clearance_Desk_PRD.md`) · `arrivalNotice.js` · courier pull sheet
**Status:** authoritative on the two-process question. Supersedes the courier/cargo model in doc 12 and the Shape C design withdrawn from doc 18.
**Last updated:** 2026

---

## 1. The correction this document records

An earlier draft built three courier mail shapes, the third being *"brief your broker — your CHA files the Bill of Entry."* It covered RBOE at 143 of 332 rows, 43% of courier volume.

**That was wrong, and it was wrong in a way that would have shipped.** The model was corrected to two courier shapes and the third was deleted.

Evidence, all three sources agreeing:

| Source | Finding |
|---|---|
| PRD §5, *Not in scope (ever)* | *"Filing BOE on ICEGATE (that's the licensed CHA's job)"* |
| PRD §2.2, §2.5, FR-15 | Courier cases pass Trace → Clearance → **Admin**, and *"Sanjay… files the BOE"* |
| PRD §2.7 | CHA *"BOE filing stays on ICEGATE; the system records 'BOE filed' when the CHA confirms"* |
| Courier pull sheet, 332 rows | CHA or broker mentioned: **0** |
| Courier pull sheet, 332 rows | Rows telling the customer to file their own BOE: **0** |
| `Reason` verbs | `REQD` 41 · `REQ` 27 · `PLS SHARE` 4 — all the customer supplying documents **to FedEx** |

---

## 2. The licence split

**FedEx holds a courier clearance licence. It does not hold a cargo clearance licence.**

| | **Courier** | **Cargo** |
|---|---|---|
| Who files the BOE | **FedEx Admin team** | **The CHA** |
| Where | FedEx's own process | ICEGATE, by a licensed CHA |
| Customer's customs relationship | **None** | Own broker or FedEx-nominated (Jeena / Sunimpex) |
| Customer is asked to | Supply documents | Supply documents **and** arrange filing |
| Ends when | BOE filed by Admin | CHA confirms *"BOE filed"* |
| Mail shapes | 2 (A, B) | 3, broker-specific |

**Consequence for every courier template:** no CHA field, no broker field, no MAWB, and never a request that the customer file or appoint anything. The single sentence that carries this is in Shape A:

> *"Once we have it, we file the Bill of Entry on your behalf — you do not need to do anything further with customs."*

That line exists because courier customers routinely assume they must handle customs themselves. Removing it is not a wording preference; it is the licence position.

---

## 3. The two processes, and where they meet

### Courier — one process, no IGM dependency

```
pull sheet (Clearance)  →  Trace Courier  →  customer supplies documents
                                                   ↓
                              Clearance  →  Admin  →  BOE filed  (FedEx)
```

**The IGM team appears nowhere in this chain.** Courier does not touch ICEGATE, does not consume IGM data, and has no payment step.

### Cargo — the IGM team is a data source, not a destination

From PRD §2.1, Priya's day:

| Time | From | Content |
|---|---|---|
| 06:00 | ACCS | UBOND data → pre-alert Excel |
| **08:00** | **IGM** | **CONSOL sheet** |
| **10:00** | **IGM** | **MAWB / IGM sheet** |
| after 10:00 | — | Post-arrival notices, hand-edited fee tables |

```
UBOND (06:00)  ─┐
                ├─→  Trace Cargo  ─→  pre-alert  ─→  customer / broker
CONSOL  (08:00) ─┤                        ↓
                │                   FR-11 merge by company name
MAWB/IGM (10:00)─┘                  (exact + fuzzy; unsure → IGM confirm)
                                          ↓
                              post-arrival notice  ─→  BOE filed by CHA
                                                          ↓
                                              CHA confirms back to system
```

**The IGM team's own work is payment and DO, not clearance** (PRD §2.3, §5):

- Verify UTR against the bank statement — every 30 min (FR-12)
- Chase short, split and not-found payments
- Process the DO in ACCS, issue the DO, mail the DO and invoice
- Issue the ICEGATE delay broadcast

### Where the two processes actually meet

| | Courier | Cargo |
|---|---|---|
| CHA | **None** | Own or nominated |
| IGM / payment | **No** | Yes |
| IGM data used | **No** | Yes — MAWB, IGM, flight, flight date |
| Post-arrival PDF | No | Yes — `arrivalNotice.js` |
| Pre-arrival PDF | No | Yes — `ubondConsol.js` |
| Admin files BOE | **Yes** | No — CHA does |

**The one shared artefact is the customer.** Same person, same FedEx relationship, two completely different clearance processes. That is why they must never be merged into one template set, and why one shared case table with a `process` column is the correct model — not one shared workflow.

---

## 4. IGM data ingestion — the fix for the composite cell

`arrivalNotice.js:92` parses this, from a pasted Excel cell:

```
MAWB-023 02961092 IGM- 3088962 Flight- FX5279t Dt - 04-07-2026
```

The Excel column is headed *MAWB No.* and holds **four fields**. The app regex-splits them because no schema was ever designed. Confirmed in the sample row at `arrival-notice/page.js:563`.

**This is the whole fragility.** One column, four values, no validation, hand-pasted at 10:00 each day.

### Target model — four columns, no parsing

| Source field | Dataverse column | Type | Notes |
|---|---|---|---|
| MAWB prefix + number | `MAWB` | text | `023 02961092` |
| IGM | `IGM number` | text | `3088962` |
| Flight | `Flight` | text | `FX5279t` |
| Flight date | `Flight date` | date | `04-07-2026` |
| Pcs code | `Pcs code` | choice | `T` = all arrived · `P` = partial |
| Pcs | `PIECES` | number | **BLOCKED — see §6** |
| WT (Kg) | `Weight kg` | decimal | |
| ORG / DEST | `Origin` / `Destination` | text | |
| STATUS | `Status` | text | |
| BROKER | `Broker` | lookup | CHA or nominated broker |
| CEP | `CEP` | text | resolves to the clearance team |
| Cmt Date | `Commit date` | datetime | |

`getPcsStatus` (`arrivalNotice.js:112`) already encodes the `T`/`P` rule, so that mapping carries over unchanged.

### IGM gets no link

| Access | Mechanism | Why not a link |
|---|---|---|
| IGM team → their own queues | Dataverse views | Queues need filters, not documents |
| IGM record → Trace Cargo | Table, role-scoped read | Live record — changes at customs without notice |
| IGM record → customer | **Never** | Regulatory data, not customer content |
| IGM record → CHA | **Never** | CHA gets the BOE packet, not the IGM master |

An IGM is not a document. It is a live record that changes at customs without warning. A link is a one-shot fetch against a static file — it would be wrong within the hour, with no way to know it had changed. **FR-17 and the §4 metrics both require the audit trail that only a table gives.**

The AWB Tracker in the existing roadmap (`sidebar-architecture-and-roadmap.md:77-92`) is already correct and needs no change: it lists AWBs with no IGM, and removes them when IGM updates. It becomes a query over the new table instead of a derived state.

---

## 5. IGM shift coverage — resolved, no night cover needed

**Question raised:** who owns the IGM queue when the IGM team is off-shift?

**Answer: nobody needs to, by design.** Three reasons, all sourced:

| Evidence | Source |
|---|---|
| Platform is available 06:00–20:00 IST; maintenance scheduled outside | NFR-05 |
| 8 IGM agents, and routine matches bypass the agent entirely — *"Routine matches go straight to the Ready-for-DO queue"* | §2.3 |
| UTR matching runs every 30 minutes, so the queue self-drains between shifts | FR-12 |

**IGM role scope stays narrow.** No clearance access, no cargo-case read, no customer link. Tables and queues only.

### One genuine issue found in the same review

`FR-12` alerts a customer *"after 3 checks"*. At a 30-minute interval, that is **90 minutes of silence** after a payment that cannot be found. A customer who has already paid, and cannot tell whether the payment landed, is a support call.

**Decision needed:** shorten the interval, or alert on the first not-found with a *"we are still checking"* message. Either is defensible. Silence for 90 minutes is not, and it is a customer-facing commitment so it belongs in the sign-off, not in a flow.

---

## 6. Blocked field — `PIECES` on cargo

**Status: BLOCKED. Not inferable. One spot-check decides it.**

### What I got wrong first

I earlier called `MPS` "undefined" and said it "blocks a phase". Both overstatements. The sheet has `MPS` populated on **332 of 332 rows**, and it blocks one field on three cargo templates — not a phase.

### What I guessed, and why the guess is not good enough

The distribution looks like a piece count:

| `MPS` | 1 | 2 | 3–9 | 10+ |
|---|---|---|---|---|
| rows | 245 | 41 | 41 | 5 |

`MPS = 27` on a single shipment is plausible for pieces and implausible for a sequence number.

**But `arrivalNotice.js:112` distinguishes `Pcs` from `Pcs code`:**

```js
if (c === 'T') return 'T (All Pieces Arrived)'
if (c === 'P') return 'P (Partially Arrived)'
```

And the app's own sample row has `Pcs Code: T` with `Pcs: 1` (`arrival-notice/page.js:563`). **The courier sheet has neither a `Pcs` nor a `Pcs code` column.** So `MPS` matches neither, and my guess is unverified.

### The test — one AWB, two minutes

> Pick a row where `MPS` is not 1 — say `MPS = 27` — and open that AWB in ACCS. **Does it show 27 pieces?**

| Result | Action |
|---|---|
| ACCS shows 27 pieces | `MPS` is the piece count. Unblock, map `MPS → PIECES` |
| ACCS shows 1 | `MPS` is something else. `PIECES` needs a real ACCS field |

**No customer-facing piece count changes on my inference.** The arrival notice prints `PIECES` commercially, and a wrong piece count is a billing-adjacent error on a regulatory document.

### Blocked until the check passes

| Item | State |
|---|---|
| `templates/cargo/03` — Kolkata FedEx CHA | `{{PIECES_BLOCK}}` blocked |
| `templates/cargo/04` — Kolkata customer CHA | `{{PIECES_BLOCK}}` blocked |
| `templates/cargo/08` — IGM not generated | `{{PIECES}}` blocked |
| `arrivalNotice.js` PDF generation | uses `row.pieces`; unaffected until the mapping is confirmed |
| Courier Shape A / Shape B | **not blocked** — courier pieces come from ACCS, unrelated field |

**Owner:** courier team lead. **Fallback if unverified:** manual entry per shipment with a required field, and the mail does not send without it. That is slower but correct, and it is the same pattern the 118 bare-`RBOE` rows already use.

---

## 7. Traceability

| Claim | Source |
|---|---|
| FedEx files courier BOE via Admin | §2.2, §2.5, FR-15 |
| CHA files cargo BOE on ICEGATE | §2.7, §5 |
| IGM is payment/DO, not clearance | §2.3, §5 |
| IGM sheets at 08:00 and 10:00 | §2.1 |
| CONSOL ↔ UBOND merge by company name | FR-11 |
| UTR every 30 min | FR-12 |
| Working hours 06:00–20:00 IST | NFR-05 |
| MAWB cell holds 4 fields | `arrivalNotice.js:92`, sample at `arrival-notice/page.js:563` |
| `Pcs code` T/P semantics | `arrivalNotice.js:112` |
| Zero CHA references in courier data | 332-row scan, `courier_pull_from_clerence.md` |
| AWB Tracker logic | `.opencode/plans/sidebar-architecture-and-roadmap.md:77-92` |
| Two courier shapes | withdrawn Shape C; see `templates/courier/00_config.md` |
